const express = require("express");
const mysql = require("mysql");
const session = require("express-session");
const flash = require("connect-flash");

const port = 3001;

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "aset",
  multipleStatements: true,
});

connection.connect(function (err) {
  if (err) {
    console.log("Cannot connect to mysql...");
    throw err;
  }
  console.log("Connected to mysql...");
});

const app = express();
app.use(
  session({
    secret: "secret",
    loggedin: false,
    resave: true,
    saveUninitialized: true,
  })
);

app.use(flash());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

//set view engine to ejs
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  req.session.register = false;
  const test = true;
  if (req.session.isadmin) {
    res.redirect("/dashboard/admin");
  } else if (req.session.loggedin) {
    res.redirect("/dashboard/user");
  } else {
    res.render("login", {
      success: test,
    });
  }
});

app.post("/auth-mhs", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  // const test = true;

  if (username && password) {
    connection.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password],
      (err, results, fields) => {
        if (err) throw err;

        if (results.length > 0) {
          req.session.loggedin = true;
          req.session.username = username;
          req.session.userid = results[0].id;
          // console.log(results[0].role);
          if (results[0].role == 1) {
            req.session.isadmin = true;
            req.session.loggedin = false;
            res.redirect("/dashboard/admin");
          } else {
            req.session.isadmin = false;
            res.redirect("/dashboard/user");
          }
        } else {
          res.send(`
          <html>
          <head>
            <title>Login Failed</title>
            <style>
              .alert {
                padding: 15px;
                background-color: #f44336;
                color: white;
              }
              .nostyle {
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="alert">Login Failed. Please <a href="/" class="nostyle">try again</a>.</div>
          </body>
          </html>
        `);

          // res.redirect("/");
        }
        res.end();
      }
    );
  } else {
    res.send("Invalid");
    res.end();
  }
});

app.get("/register", (req, res) => {
  session_reg = req.session.register;
  res.render("register", { session_reg });
});

app.post("/account-register", (req, res) => {
  const data = req.body;
  const query = `
  INSERT INTO users (name, username, password, role) VALUES ('${data.name}', '${data.username}', '${data.password}', '0')`;
  connection.query(query, (err) => {
    if (err) throw err;
    req.session.register = true;
    session_reg = req.session.register;
    res.render("register", { session_reg });
  });
});

app.get("/dashboard/admin", (req, res) => {
  if (req.session.isadmin) {
    // Rute ini sekarang dilindungi dan hanya dapat diakses oleh pengguna yang sudah login dan adalah admin
    const totalAset = 100;
    const nilaiAsetLokasi = {
      Lokasi1: 50000,
      Lokasi2: 70000,
    };
    const jumlahAsetKategori = {
      Kategori1: 40,
      Kategori2: 60,
    };

    // Render halaman dashboard.ejs dengan data yang diberikan
    res.render("admin/dashboard", {
      totalAset: totalAset,
      nilaiAsetLokasi: nilaiAsetLokasi,
      jumlahAsetKategori: jumlahAsetKategori,
    });
  } else {
    res.redirect("/");
  }
});

// Menampilkan halaman kategori
app.get("/kategori", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query("SELECT * FROM kategori", (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("admin/kategori", { kategoris: results });
    });
  }
});

// Menampilkan tampilan tambah kategori (GET request)
app.get("/kategori/tambah", (req, res) => {
  res.render("admin/kategori-tambah"); // Ganti "tambah-kategori" dengan nama file EJS Anda
});

// Handle POST request to add a new category
app.post("/kategori/tambah", (req, res) => {
  if (req.session.isadmin) {
    const { idkategori, kategori } = req.body;
    const query = `INSERT INTO kategori (id_kategori, nama_kategori) VALUES (${idkategori}, '${kategori}')`;
    connection.query(query, (error, results, fields) => {
      if (error) throw error;
      console.log("Category added successfully!");
      res.redirect("/kategori");
    });
  } else {
    res.redirect("/");
  }
});

// Menampilkan halaman edit kategori
app.get("/kategori/edit/:id", (req, res) => {
  const categoryId = req.params.id;
  connection.query(
    "SELECT * FROM kategori WHERE id_kategori = ?",
    [categoryId],
    (error, results) => {
      if (error) throw error;
      res.render("admin/kategori-edit", { kategori: results[0] }); // Ganti "edit-kategori.ejs" dengan nama file EJS Anda
    }
  );
});

// Menangani permintaan untuk menyimpan perubahan kategori yang telah diedit
app.post("/kategori/edit/:id", (req, res) => {
  const categoryId = req.params.id;
  const { idkategori, kategori } = req.body;
  const query = `UPDATE kategori SET id_kategori = ${idkategori}, nama_kategori = '${kategori}' WHERE id_kategori = ${categoryId}`;
  connection.query(query, (error, results) => {
    if (error) throw error;
    console.log("Category updated successfully!");
    res.redirect("/kategori");
  });
});

// Handle GET request to delete a category
app.get("/kategori/delete/:id", (req, res) => {
  const categoryId = req.params.id;
  const query = `DELETE FROM kategori WHERE id_kategori = ${categoryId}`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Category deleted successfully!");
    res.redirect("/kategori");
  });
});

// Endpoint untuk menampilkan daftar jenis
app.get("/jenis", (req, res) => {
  if (req.session.isadmin) {
    connection.query("SELECT * FROM jenis", (error, results, fields) => {
      if (error) throw error;
      res.render("admin/jenis", { jenis: results });
    });
  } else {
    res.redirect("/");
  }
});

// Endpoint untuk menampilkan halaman tambah jenis
app.get("/jenis/tambah", (req, res) => {
  res.render("admin/jenis-tambah");
});

// // Endpoint untuk menangani penambahan jenis
// app.post("/jenis/tambah", (req, res) => {
//   const { id_kategori, nama_jenis } = req.body;
//   const query = `INSERT INTO jenis (id_kategori, nama_jenis) VALUES (${id_kategori}, '${nama_jenis}')`;

//   connection.query(query, (error, results, fields) => {
//     if (error) {
//       return res.status(500).send("Gagal menambah jenis baru");
//     }

//     res.redirect("/jenis");
//   });
// });

// // Endpoint untuk menampilkan halaman edit jenis
// app.get("/jenis/edit/:id", (req, res) => {
//   const jenisId = req.params.id;
//   connection.query(
//     `SELECT * FROM jenis WHERE id = ${jenisId}`,
//     (error, results, fields) => {
//       if (error) throw error;
//       res.render("admin/jenis-edit", { jenis: results[0] });
//     }
//   );
// });

// // Endpoint untuk menangani pengeditan jenis
// app.post("/jenis/edit/:id", (req, res) => {
//   const jenisId = req.params.id;
//   const { id_kategori, nama_jenis } = req.body;
//   const query = `UPDATE jenis SET id_kategori = ${id_kategori}, nama_jenis = '${nama_jenis}' WHERE id = ${jenisId}`;

//   connection.query(query, (error, results, fields) => {
//     if (error) {
//       return res.status(500).send("Gagal mengedit jenis");
//     }

//     res.redirect("/jenis");
//   });
// });

// Menampilkan halaman kategori
app.get("/lokasi", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query("SELECT * FROM lokasi", (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("admin/lokasi", { lokasi: results });
    });
  } else {
    res.redirect("/");
  }
});

// Menampilkan tampilan tambah kategori (GET request)
app.get("/lokasi/tambah", (req, res) => {
  res.render("admin/lokasi-tambah"); // Ganti "tambah-kategori" dengan nama file EJS Anda
});

// Handle POST request to add a new location
app.post("/lokasi/tambah", (req, res) => {
  if (req.session.isadmin) {
    const lokasi = req.body.Lokasi;
    const query = `INSERT INTO lokasi (nama_lokasi) VALUES ('${lokasi}')`;

    connection.query(query, (error, results, fields) => {
      if (error) {
        return res.status(500).send("Gagal menambah lokasi baru");
      }

      res.redirect("/lokasi");
    });
  } else {
    res.redirect("/");
  }
});

app.get("/lokasi/edit/:id", (req, res) => {
  const lokasiId = req.params.id;
  // Query data lokasi berdasarkan ID
  connection.query(
    "SELECT * FROM lokasi WHERE id = ?",
    [lokasiId],
    (error, results, fields) => {
      if (error) throw error;
      // Kirim data lokasi yang akan diedit ke halaman edit
      res.render("admin/lokasi-edit", { lokasi: results[0] });
    }
  );
});

app.post("/lokasi/edit/:id", (req, res) => {
  const lokasiId = req.params.id;
  const { nama_lokasi } = req.body;
  // Update data lokasi berdasarkan ID
  connection.query(
    "UPDATE lokasi SET nama_lokasi = ? WHERE id = ?",
    [nama_lokasi, lokasiId],
    (error, results, fields) => {
      if (error) throw error;
      // Redirect ke halaman lokasi setelah mengedit data
      res.redirect("/lokasi");
    }
  );
});

app.get("/lokasi/delete/:id", (req, res) => {
  const lokasiId = req.params.id;
  // Hapus data lokasi berdasarkan ID
  connection.query(
    "DELETE FROM lokasi WHERE id = ?",
    [lokasiId],
    (error, results, fields) => {
      if (error) throw error;
      // Redirect ke halaman lokasi setelah menghapus data
      res.redirect("/lokasi");
    }
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.listen(port, () => {
  console.log("Server started at port " + port);
  console.log("http://localhost:" + port);
});
