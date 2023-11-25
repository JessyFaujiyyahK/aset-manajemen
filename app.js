const express = require("express");
const mysql = require("mysql");
const session = require("express-session");
const flash = require("connect-flash");
const multer = require("multer");
const path = require("path");

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

app.use("/uploads", express.static("uploads"));

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

// -------------------------------- DASHBOARD  -------------------------------- //

app.get("/dashboard/admin", (req, res) => {
  if (req.session.isadmin) {
    const queryKategori =
      "SELECT LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) AS kategori, k.nama_kategori, SUM(a.jumlah) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori GROUP BY kategori, k.nama_kategori";

    // const queryNilaiLokasi =
    //   "SELECT a.nilai, l.nama_lokasi AS lokasi, SUM(a.nilai) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori JOIN lokasi l ON a.id_lokasi = l.id GROUP BY a.nilai, lokasi";

    const queryNilaiLokasi =
      "SELECT l.nama_lokasi AS lokasi, SUM(a.nilai) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori JOIN lokasi l ON a.id_lokasi = l.id GROUP BY lokasi";

    const querySumber =
      "SELECT a.sumber, SUM(a.jumlah) as total FROM aset a GROUP BY a.sumber";

    const queryTotalAset = "SELECT SUM(jumlah) as totalAset FROM aset";
    const queryTotalNilai = "SELECT SUM(nilai) as totalNilai FROM aset";

    connection.query(
      queryKategori,
      (errorKategori, resultsKategori, fieldsKategori) => {
        if (errorKategori) {
          throw errorKategori;
        }

        connection.query(
          queryNilaiLokasi,
          (errorNilaiLokasi, resultsNilaiLokasi, fieldsNilaiLokasi) => {
            if (errorNilaiLokasi) {
              throw errorNilaiLokasi;
            }

            connection.query(
              querySumber,
              (errorSumber, resultsSumber, fieldsSumber) => {
                if (errorSumber) {
                  throw errorSumber;
                }

                connection.query(
                  queryTotalAset,
                  (errorTotalAset, resultsTotalAset) => {
                    if (errorTotalAset) {
                      throw errorTotalAset;
                    }

                    connection.query(
                      queryTotalNilai,
                      (errorTotalNilai, resultsTotalNilai) => {
                        if (errorTotalNilai) {
                          throw errorTotalNilai;
                        }

                        // Ambil hasil query untuk total aset dan total nilai
                        const totalAset = resultsTotalAset[0].totalAset;
                        const totalNilai = resultsTotalNilai[0].totalNilai;

                        res.render("admin/dashboard", {
                          dataKategori: resultsKategori,
                          dataNilaiLokasi: resultsNilaiLokasi,
                          dataSumber: resultsSumber,
                          totalAset: totalAset,
                          totalNilai: totalNilai,
                          userName: req.session.username,
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  } else {
    res.redirect("/");
  }
});

// -------------------------------- ASET  -------------------------------- //

// Menampilkan halaman aset
app.get("/aset", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query(
      "SELECT *, nama_aset.nama_aset, lokasi.nama_lokasi, aset.id as id FROM aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id",
      (error, results) => {
        if (error) throw error;
        res.render("admin/aset", {
          aset: results,
          userName: req.session.username,
        });
      }
    );
  } else {
    res.redirect("/");
  }
});

// Menampilkan halaman aset tambah
app.get("/aset/tambah", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    const sql = `SELECT * From nama_aset; SELECT * FROM lokasi; select * from sumber`;
    connection.query(sql, (error, results) => {
      if (error) throw error;
      res.render("admin/aset-tambah", {
        aset: results[0],
        lokasi: results[1],
        sumber: results[2],
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

app.post("/aset/tambah", (req, res) => {
  if (req.session.isadmin) {
    const { lokasi, aset, nilai, jumlah, sumber, kondisi } = req.body;
    const checkAset = `select * from aset where id_aset = '${aset}'`;
    // const sql = `SELECT * FROM kategori WHERE nama_kategori = '${kategori}';SELECT MAX(id_kategori) AS lastIdKategori FROM kategori`;
    connection.query(checkAset, (error, results, fields) => {
      if (error) throw error;

      // Jika length > 1 berarti datanya ada
      // if (results.length > 0) {
      // Jika kategori sudah ada, kirim tanggapan ke client
      // UPDATE kategori SET id_kategori = ${idkategori}, nama_kategori = '${kategori}' WHERE id_kategori = ${categoryId}
      // console.log(results[0]);
      // const jumlahAsetSekarang = results[0];
      // const updateJumlah = 'UPDATE aset SET jumlah = '
      // } else {
      const insertQuery = `INSERT INTO aset (id_aset, nilai, jumlah, id_lokasi, sumber, kondisi) VALUES ('${aset}',${nilai}, ${jumlah}, ${lokasi}, '${sumber}', '${kondisi}')`;
      connection.query(insertQuery, (error, results, fields) => {
        if (error) throw error;
        console.log("Aset added successfully!");
        res.redirect("/aset");
      });
      // }
    });
  }
});

// Menampilkan halaman aset edit
app.get("/aset/edit/:id", (req, res) => {
  const id = req.params.id;
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    const sql = `SELECT * From nama_aset; select * from lokasi; select * from sumber; select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id JOIN sumber on aset.id_sumber = sumber.id WHERE aset.id = ${id}`;
    // const sql = `SELECT * From nama_aset; select * from lokasi; select * from sumber; select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id WHERE aset.id = ${id}`;

    connection.query(sql, (error, results) => {
      if (error) throw error;
      console.log(results[2][0]);
      const sumberLama = results[3][0].sumber;
      const jumlah = results[3][0].jumlah;
      const nilai = results[3][0].nilai;
      const kondisi = results[3][0].kondisi;
      const idAset = results[3][0].id_aset;
      const namaAset = results[3][0].nama_aset;
      const namaLokasi = results[3][0].nama_lokasi;
      const lokasiID = results[3][0].id_lokasi;
      // const sumberID = results[3][0].id_sumber
      // console.log(results[2][0]);
      res.render("admin/aset-edit", {
        aset: results[0],
        lokasi: results[1],
        sumber: results[2],
        sumberLama,
        jumlah,
        nilai,
        kondisi,
        idAset,
        asetID: id,
        namaAset,
        namaLokasi,
        lokasiID,
        // sumberID
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Menangani permintaan untuk menyimpan perubahan aset yang telah diedit
app.post("/aset/edit/:id", (req, res) => {
  const asetID = req.params.id;
  const { lokasi, aset, nilai, jumlah, sumber, kondisi } = req.body;
  const query = `UPDATE aset SET id_lokasi = ${lokasi}, id_aset = '${aset}', nilai = ${nilai}, jumlah=${jumlah}, sumber = '${sumber}', kondisi = '${kondisi}' WHERE id = ${asetID}`;
  connection.query(query, (error, results) => {
    if (error) throw error;
    console.log("Aset updated successfully!");
    res.redirect("/aset");
  });
});

// Menampilkan aset detail
app.get("/aset/detail/:id", (req, res) => {
  const asetId = req.params.id;
  const query = `select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id WHERE aset.id = ${asetId}`;
  connection.query(query, (error, results, fields) => {
    console.log(results);
    if (error) throw error;
    res.render("admin/detail-aset", {
      aset: results,
      userName: req.session.username,
    });
  });
});

// Endpoint untuk menangani hapus aset
app.get("/aset/delete/:id", (req, res) => {
  const asetId = req.params.id;
  const query = `DELETE FROM aset WHERE id = ${asetId}`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Aset deleted successfully!");
    res.redirect("/aset");
  });
});

// -------------------------------- KATEGORI  -------------------------------- //
// Menampilkan halaman kategori
app.get("/kategori", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query("SELECT * FROM kategori", (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("admin/kategori", {
        kategoris: results,
        userName: req.session.username,
      });
    });
  }
});

// Menampilkan tampilan tambah kategori (GET request)
app.get("/kategori/tambah", (req, res) => {
  res.render("admin/kategori-tambah", { userName: req.session.username }); // Ganti "tambah-kategori" dengan nama file EJS Anda
});

app.post("/kategori/tambah", (req, res) => {
  if (req.session.isadmin) {
    const { kategori } = req.body;
    const checkQuery = `SELECT * FROM kategori WHERE nama_kategori = '${kategori}'`;
    const sql = `SELECT * FROM kategori WHERE nama_kategori = '${kategori}';SELECT MAX(id_kategori) AS lastIdKategori FROM kategori`;
    connection.query(sql, (error, results, fields) => {
      if (error) throw error;

      if (results[0].length > 0) {
        // Jika kategori sudah ada, kirim tanggapan ke client
        res.status(400).json({ message: "Category already exists!" });
      } else {
        const lastIdKategori = results[1][0].lastIdKategori || 0;
        const idkategori = parseInt(lastIdKategori) + 1;
        console.log(idkategori);
        const insertQuery = `INSERT INTO kategori (id_kategori, nama_kategori) VALUES (${parseInt(
          idkategori
        )}, '${kategori}')`;
        connection.query(insertQuery, (error, results, fields) => {
          if (error) throw error;
          console.log("Category added successfully!");
          res.redirect("/kategori");
        });
      }
    });
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
      res.render("admin/kategori-edit", {
        kategori: results[0],
        userName: req.session.username,
      });
    }
  );
});

// Menangani permintaan untuk menyimpan perubahan kategori yang telah diedit
app.post("/kategori/edit/:id", (req, res) => {
  const categoryId = req.params.id;
  const { idkategori, kategori } = req.body;

  // Check if the new idkategori or kategori already exists in the database
  const checkExistingQuery = `SELECT * FROM kategori WHERE (id_kategori = ${idkategori} OR nama_kategori = '${kategori}') AND id_kategori != ${categoryId}`;

  connection.query(checkExistingQuery, (error, results) => {
    if (error) {
      const errorMessage = "Terjadi kesalahan pada server.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/kategori";
        </script>
      `);
    }

    if (results.length > 0) {
      // New idkategori or kategori already exists, return an error message
      const errorMessage = "Nama Kategori sudah digunakan";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/kategori";
        </script>
      `);
    } else {
      // Check if the category is associated with jenis or nama aset
      const checkAssociationQuery = `SELECT * FROM jenis WHERE id_kategori = ${categoryId} OR id_kategori = ${idkategori}`;

      connection.query(checkAssociationQuery, (error, results) => {
        if (error) {
          const errorMessage = "Terjadi kesalahan pada server.";
          return res.send(`
            <script>
              alert("${errorMessage}");
              window.location.href = "/kategori";
            </script>
          `);
        }

        if (results.length > 0) {
          // Category is associated with jenis or nama aset, return an error message
          const errorMessage =
            "Kategori terhubung dengan jenis atau nama aset dan tidak dapat diedit.";
          return res.send(`
            <script>
              alert("${errorMessage}");
              window.location.href = "/kategori";
            </script>
          `);
        } else {
          // Category is not associated, proceed with the update
          const updateQuery = `UPDATE kategori SET id_kategori = ${idkategori}, nama_kategori = '${kategori}' WHERE id_kategori = ${categoryId}`;

          connection.query(updateQuery, (error, results) => {
            if (error) {
              const errorMessage = "Gagal mengedit kategori.";
              return res.send(`
                <script>
                  alert("${errorMessage}");
                  window.location.href = "/kategori";
                </script>
              `);
            }

            console.log("Category updated successfully!");
            res.redirect("/kategori");
          });
        }
      });
    }
  });
});

// Handle GET request to delete a category
app.get("/kategori/delete/:id", (req, res) => {
  const categoryId = req.params.id;
  const query = `DELETE FROM kategori WHERE id_kategori = ${categoryId}`;
  connection.query(query, (error, results, fields) => {
    if (error) {
      // Periksa apakah pesan kesalahan terkait dengan foreign key constraint
      if (error.errno === 1451) {
        const errorMessage =
          "Baris ini tidak dapat dihapus karena memiliki ketergantungan dengan tabel lain.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/kategori";
          </script>
        `);
      } else {
        const errorMessage = "Terjadi kesalahan saat menghapus kategori.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/kategori";
          </script>
        `);
      }
    } else {
      const successMessage = "Kategori berhasil dihapus.";
      res.send(`
        <script>
          alert("${successMessage}");
          window.location.href = "/kategori";
        </script>
      `);
    }
  });
});

// -------------------------------- JENIS  -------------------------------- //

// Endpoint untuk menampilkan daftar jenis
app.get("/jenis", (req, res) => {
  if (req.session.isadmin) {
    connection.query("SELECT * FROM jenis", (error, results, fields) => {
      if (error) throw error;
      res.render("admin/jenis", {
        jenis: results,
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Endpoint untuk menampilkan halaman tambah jenis
app.get("/jenis/tambah", (req, res) => {
  if (req.session.isadmin) {
    // Ambil id_jenis terbaru berdasarkan id_kategori
    // const getLastIdJenis = `SELECT MAX(id_jenis) AS lastIdJenis FROM jenis WHERE id_kategori=${idkategori}`
    // Mengambil data kategori dari basis data MySQL
    const selectKategori = "SELECT * FROM kategori";

    connection.query(selectKategori, (error, results) => {
      // console.log("Kategori: ", results[0]);
      // console.log("Id jenis: ", results[1]);
      if (error) {
        throw error;
      }
      // Menampilkan halaman kategori dengan data kategori
      res.render("admin/jenis-tambah", {
        kategoris: results,
        userName: req.session.username,
      });
    });
  }
  // res.render("admin/jenis-tambah");
});

// Endpoint untuk menangani penambahan jenis
app.post("/jenis/tambah", (req, res) => {
  const { idkategori, jenis } = req.body;

  // Periksa apakah jenis sudah ada di database
  const checkJenisQuery = `SELECT * FROM jenis WHERE id_kategori = ${idkategori} AND nama_jenis = '${jenis}'`;

  connection.query(checkJenisQuery, (error, results) => {
    if (error) {
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan pada server." });
    }

    if (results.length > 0) {
      const errorMessage = "Jenis sudah ada di database.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/jenis";
        </script>
      `);
    }

    // Jika jenis belum ada, lakukan penambahan data jenis
    const getLastIdJenis = `SELECT MAX(id_jenis) AS lastIdJenis FROM jenis WHERE id_kategori = ${idkategori}`;

    connection.query(getLastIdJenis, (error, results, fields) => {
      if (error) {
        return res.status(400).json({ message: "ID Jenis Tidak Ditemukan." });
      }

      const lastIdJenis = results[0].lastIdJenis || 0;
      let splitIdJenis;
      if (typeof lastIdJenis === "string") {
        splitIdJenis = lastIdJenis.split(".")[1];
      }
      const newIdJenis =
        splitIdJenis === undefined
          ? parseInt(lastIdJenis) + 1
          : parseInt(splitIdJenis) + 1;
      const idJenis = `${idkategori}.${newIdJenis}`;
      const insertJenis = `INSERT INTO jenis (id_jenis, id_kategori, nama_jenis) VALUES ('${idJenis}', ${idkategori}, '${jenis}')`;

      connection.query(insertJenis, (error, results) => {
        if (error) {
          // return res.status(500).json({ message: "Gagal menambahkan jenis." });
          const failMessage = "Gagal menambahkan jenis";
          return res.send(`
            <script>
              alert("${failMessage}");
              window.location.href = "/jenis";
            </script>
          `);
        } else {
          const successMessage = "Jenis berhasil ditambahkan ke database.";
          return res.send(`
            <script>
              alert("${successMessage}");
              window.location.href = "/jenis";
            </script>
          `);
        }
      });
    });
  });
});

// Endpoint untuk menampilkan halaman edit jenis
app.get("/jenis/edit/:id", (req, res) => {
  const jenisId = req.params.id;
  connection.query(
    `SELECT * FROM jenis WHERE id_jenis = ${jenisId}`,
    (error, results, fields) => {
      if (error) throw error;
      // console.log(results[0].nama_jenis);
      res.render("admin/jenis-edit", {
        nama_jenis: results[0].nama_jenis,
        id_jenis: results[0].id_jenis,
        userName: req.session.username,
      });
    }
  );
});

// Endpoint untuk menangani pengeditan jenis
app.post("/jenis/edit", (req, res) => {
  const { jenis, idJenis } = req.body;
  const query = `UPDATE jenis SET nama_jenis = '${jenis}' WHERE id_jenis = ${idJenis}`;

  connection.query(query, (error, results, fields) => {
    if (error) {
      // return res.status(500).send("Gagal mengedit jenis");
      throw error;
    }

    res.redirect("/jenis");
  });
});

app.get("/jenis/delete/:id", (req, res) => {
  const jenisId = req.params.id;
  const query = `DELETE FROM jenis WHERE id_jenis = ${jenisId}`;
  connection.query(query, (error, results, fields) => {
    if (error) {
      // Periksa apakah pesan kesalahan terkait dengan foreign key constraint
      if (error.errno === 1451) {
        const errorMessage =
          "Baris ini tidak dapat dihapus karena memiliki ketergantungan dengan tabel lain.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/jenis";
          </script>
        `);
      } else {
        const errorMessage = "Terjadi kesalahan saat menghapus kategori.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/jenis";
          </script>
        `);
      }
    } else {
      const successMessage = "Jenis berhasil dihapus.";
      res.send(`
        <script>
          alert("${successMessage}");
          window.location.href = "/jenis";
        </script>
      `);
    }
  });
});

// -------------------------------- NAMA ASET  -------------------------------- //

// Endpoint untuk menampilkan daftar nama aset
app.get("/nama/aset", (req, res) => {
  if (req.session.isadmin) {
    connection.query("SELECT * FROM nama_aset", (error, results, fields) => {
      if (error) throw error;
      res.render("admin/nama-aset", {
        nama_aset: results,
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Endpoint untuk menampilkan halaman tambah nama aset
app.get("/nama/aset/tambah", (req, res) => {
  if (req.session.isadmin) {
    // Ambil id_aset terbaru berdasarkan id_jenis
    // const getLastIdAset = `SELECT MAX(id_aset) AS lastIdAset FROM nama_aset WHERE id_jenis=${idjenis}`
    // Mengambil data kategori dari basis data MySQL
    // const selectKategori = "SELECT * FROM jenis";
    const selectJenis = "SELECT * FROM jenis";

    // const sql = "SELECT * FROM jenis; SELECT * FROM kategori";
    connection.query(selectJenis, (error, results) => {
      // console.log(results[1]);
      // console.log(data);
      if (error) {
        throw error;
      }
      // Menampilkan halaman jenis dengan data jenis
      res.render("admin/nama-aset-tambah", {
        jenis: results,
        userName: req.session.username,
      });
    });
  }
  // res.render("admin/nama-aset-tambah");
});

// Endpoint untuk menangani penambahan nama aset
app.post("/nama/aset/tambah", upload.single("aset-file"), (req, res) => {
  // Ambil payload dari body
  const { idJenis, aset } = req.body;
  const imgDestination = req.file.destination;
  const imgDestination2 = imgDestination.replace(/\./g, "");
  const imgName = req.file.filename;
  const imgUrl = `${imgDestination2}/${imgName}`;
  // console.log(imgUrl);

  // Ambil id aset terakhir
  const getLastIdAset = `SELECT MAX(id_aset) AS lastIdAset FROM nama_aset WHERE id_jenis = ${idJenis}`;
  const sql = `SELECT MAX(id_aset) AS lastIdAset FROM nama_aset WHERE id_jenis = ${idJenis}; SELECT COUNT(*) as count from nama_aset WHERE nama_aset = '${aset}'`;

  connection.query(sql, (error, results, fields) => {
    if (error) {
      res.status(400).json({ msg: "ID Aset Tidak Ditemukan" });
    } else {
      const lastIdAset = results[0][0].lastIdAset || 0;
      let splitIdAset;
      if (typeof lastIdAset === "string") {
        splitIdAset = lastIdAset.split(".")[2];
      }

      // const newIdAset = parseInt(splitIdAset) + 1;
      const newIdAset =
        splitIdAset === undefined
          ? parseInt(lastIdAset) + 1
          : parseInt(splitIdAset) + 1;
      const idAset = `${idJenis}.${newIdAset}`;
      const id_kategori = idJenis.split(".")[0];
      const cekNamaAset = results[1][0].count;
      if (cekNamaAset > 0) {
        const errorMessage = "Nama Aset Sudah Digunakan.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/nama/aset/tambah";
          </script>
        `);
      } else {
        const insertAset = `INSERT INTO nama_aset (id_aset, id_kategori, id_jenis, nama_aset, images) values ('${idAset}', ${parseInt(
          id_kategori
        )}, '${idJenis}', '${aset}', '${imgUrl}')`;
        connection.query(insertAset, (error, results) => {
          if (error) {
            return res.status(500).json({ msg: error.message });
          } else {
            // res.status(201).json({ msg: "Berhasil tambah jenis", data: results });
            res.redirect("/nama/aset");
          }
        });
      }
    }
  });
});

// Endpoint untuk menampilkan halaman edit nama aset
app.get("/nama/aset/edit/:id", (req, res) => {
  const asetId = req.params.id;
  connection.query(
    `SELECT * FROM nama_aset WHERE id_aset = '${asetId}'`,
    (error, results, fields) => {
      if (error) throw error;
      // console.log(results[0].nama_jenis);
      res.render("admin/nama-aset-edit", {
        nama_aset: results[0].nama_aset,
        img: results[0].images,
        id_aset: results[0].id_aset,
        userName: req.session.username,
      });
    }
  );
});

// Endpoint untuk menangani halaman edit nama aset
app.post("/nama/aset/edit", upload.single("img-aset"), (req, res) => {
  const { nama_aset, idAset } = req.body;
  console.log(req.file);

  // Check if the new asset name is already in use by another asset
  const checkExistingQuery = `SELECT * FROM nama_aset WHERE nama_aset = '${nama_aset}' AND id_aset != '${idAset}'`;

  connection.query(checkExistingQuery, (error, results) => {
    if (error) {
      const errorMessage = "Terjadi kesalahan pada server.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/nama/aset";
        </script>
      `);
    }

    if (results.length > 0) {
      // Asset name is already in use by another asset, return an error message
      const errorMessage = "Nama aset sudah digunakan oleh aset lain.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/nama/aset";
        </script>
      `);
    } else {
      // Asset name is not in use, proceed with the update
      let updateQuery = "";
      if (req.file) {
        const imgDestination = req.file.destination;
        const imgDestination2 = imgDestination.replace(/\./g, "");
        const imgName = req.file.filename;
        const imgUrl = `${imgDestination2}/${imgName}`;
        updateQuery = `UPDATE nama_aset SET nama_aset = '${nama_aset}', images = '${imgUrl}' WHERE id_aset = '${idAset}'`;
      } else {
        updateQuery = `UPDATE nama_aset SET nama_aset = '${nama_aset}' WHERE id_aset = '${idAset}'`;
      }

      connection.query(updateQuery, (error, results, fields) => {
        if (error) {
          const errorMessage = "Gagal mengedit aset.";
          return res.send(`
            <script>
              alert("${errorMessage}");
              window.location.href = "/nama/aset";
            </script>
          `);
        }
        // Redirect to the asset page after editing data
        res.redirect("/nama/aset");
      });
    }
  });
});

app.get("/nama/aset/delete/:id", (req, res) => {
  const asetId = req.params.id;

  // Periksa apakah ada aset terkait dengan data yang akan dihapus
  connection.query(
    "SELECT COUNT(*) AS jumlahAset FROM aset WHERE id_aset = ?",
    [asetId],
    (error, results, fields) => {
      if (error) throw error;

      const jumlahAset = results[0].jumlahAset;

      // Jika ada aset terkait, tampilkan pesan kesalahan dan kembali ke halaman data aset
      if (jumlahAset > 0) {
        const errorMessage =
          "Tidak dapat menghapus data karena masih terdapat aset terkait.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/nama/aset";
          </script>
        `);
      }

      // Jika tidak ada aset terkait, lanjutkan dengan menghapus data
      const deleteQuery = `DELETE FROM nama_aset WHERE id_aset = '${asetId}'`;
      connection.query(deleteQuery, (error, results, fields) => {
        if (error) throw error;
        console.log("Aset deleted successfully!");
        res.redirect("/nama/aset");
      });
    }
  );
});

// -------------------------------- LOKASI  -------------------------------- //

// Menampilkan halaman lokasi
app.get("/lokasi", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query("SELECT * FROM lokasi", (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("admin/lokasi", {
        lokasi: results,
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Menampilkan tampilan tambah lokasi (GET request)
app.get("/lokasi/tambah", (req, res) => {
  res.render("admin/lokasi-tambah", { userName: req.session.username }); // Ganti "tambah-kategori" dengan nama file EJS Anda
});

// Handle POST request to add a new location

app.post("/lokasi/tambah", (req, res) => {
  if (req.session.isadmin) {
    const lokasi = req.body.Lokasi;

    // Check if the location already exists in the database
    const checkExistingQuery = `SELECT * FROM lokasi WHERE nama_lokasi = '${lokasi}'`;

    connection.query(checkExistingQuery, (error, results) => {
      if (error) {
        const errorMessage = "Terjadi kesalahan pada server.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/lokasi";
          </script>
        `);
      }

      if (results.length > 0) {
        // Location already exists, return an error message
        const errorMessage = "Lokasi sudah ada di database.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/lokasi";
          </script>
        `);
      } else {
        // Location doesn't exist, proceed with the insertion
        const insertQuery = `INSERT INTO lokasi (nama_lokasi) VALUES ('${lokasi}')`;

        connection.query(insertQuery, (error, results, fields) => {
          if (error) {
            const errorMessage = "Gagal menambah lokasi baru.";
            return res.send(`
              <script>
                alert("${errorMessage}");
                window.location.href = "/lokasi";
              </script>
            `);
          }

          res.redirect("/lokasi");
        });
      }
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
      res.render("admin/lokasi-edit", {
        lokasi: results[0],
        userName: req.session.username,
      });
    }
  );
});

app.post("/lokasi/edit/:id", (req, res) => {
  const lokasiId = req.params.id;
  const { nama_lokasi } = req.body;

  // Check if the new location name is already in use by another location
  const checkExistingQuery = `SELECT * FROM lokasi WHERE nama_lokasi = '${nama_lokasi}' AND id != ${lokasiId}`;

  connection.query(checkExistingQuery, (error, results) => {
    if (error) {
      const errorMessage = "Terjadi kesalahan pada server.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/lokasi";
        </script>
      `);
    }

    if (results.length > 0) {
      // Location name is already in use by another location, return an error message
      const errorMessage = "Nama lokasi sudah digunakan oleh lokasi lain.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/lokasi";
        </script>
      `);
    } else {
      // Location name is not in use, proceed with the update
      connection.query(
        "UPDATE lokasi SET nama_lokasi = ? WHERE id = ?",
        [nama_lokasi, lokasiId],
        (error, results, fields) => {
          if (error) {
            const errorMessage = "Gagal mengedit lokasi.";
            return res.send(`
              <script>
                alert("${errorMessage}");
                window.location.href = "/lokasi";
              </script>
            `);
          }
          // Redirect ke halaman lokasi setelah mengedit data
          res.redirect("/lokasi");
        }
      );
    }
  });
});

app.get("/lokasi/delete/:id", (req, res) => {
  const lokasiId = req.params.id;

  // Periksa apakah ada aset terkait dengan lokasi yang akan dihapus
  connection.query(
    "SELECT COUNT(*) AS jumlahAset FROM aset WHERE id_lokasi = ?",
    [lokasiId],
    (error, results, fields) => {
      if (error) throw error;

      const jumlahAset = results[0].jumlahAset;

      // Jika ada aset terkait, tampilkan pesan kesalahan dan kembali ke halaman lokasi
      if (jumlahAset > 0) {
        const errorMessage =
          "Tidak dapat menghapus lokasi karena masih terdapat aset terkait.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/lokasi";
          </script>
        `);
      }

      // Jika tidak ada aset terkait, lanjutkan dengan menghapus lokasi
      connection.query(
        "DELETE FROM lokasi WHERE id = ?",
        [lokasiId],
        (error, results, fields) => {
          if (error) throw error;
          // Redirect ke halaman lokasi setelah menghapus data
          res.redirect("/lokasi");
        }
      );
    }
  );
});

// -------------------------------- SUMBER  -------------------------------- //

// Menampilkan halaman sumber
app.get("/sumber", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query("SELECT * FROM sumber", (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("admin/sumber", {
        sumbers: results,
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Menampilkan tampilan tambah sumber (GET request)
app.get("/sumber/tambah", (req, res) => {
  res.render("admin/sumber-tambah", { userName: req.session.username }); // Ganti "tambah-kategori" dengan nama file EJS Anda
});

// Handle POST request to add a new sumber

app.post("/sumber/tambah", (req, res) => {
  if (req.session.isadmin) {
    const sumber = req.body.Sumber;

    // Check if the location already exists in the database
    const checkExistingQuery = `SELECT * FROM sumber WHERE nama_sumber = '${sumber}'`;

    connection.query(checkExistingQuery, (error, results) => {
      if (error) {
        const errorMessage = "Terjadi kesalahan pada server.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.source.href = "/sumber";
          </script>
        `);
      }

      if (results.length > 0) {
        // Location already exists, return an error message
        const errorMessage = "Sumber sudah ada di database.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.source.href = "/sumber";
          </script>
        `);
      } else {
        // Location doesn't exist, proceed with the insertion
        const insertQuery = `INSERT INTO sumber (nama_sumber) VALUES ('${sumber}')`;

        connection.query(insertQuery, (error, results, fields) => {
          if (error) {
            const errorMessage = "Gagal menambah sumber baru.";
            return res.send(`
              <script>
                alert("${errorMessage}");
                window.sumber.href = "/sumber";
              </script>
            `);
          }

          res.redirect("/sumber");
        });
      }
    });
  } else {
    res.redirect("/sumber");
  }
});

app.get("/sumber/edit/:id", (req, res) => {
  const sumberId = req.params.id;
  // Query data lokasi berdasarkan ID
  connection.query(
    "SELECT * FROM sumber WHERE id = ?",
    [sumberId],
    (error, results, fields) => {
      if (error) throw error;
      // Kirim data lokasi yang akan diedit ke halaman edit
      res.render("admin/sumber-edit", {
        sumber: results[0],
        userName: req.session.username,
      });
    }
  );
});

app.post("/sumber/edit/:id", (req, res) => {
  const sumberId = req.params.id;
  const { nama_sumber } = req.body;

  // Check if the new location name is already in use by another location
  const checkExistingQuery = `SELECT * FROM sumber WHERE nama_sumber = '${nama_sumber}' AND id != ${sumberId}`;

  connection.query(checkExistingQuery, (error, results) => {
    if (error) {
      const errorMessage = "Terjadi kesalahan pada server.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.source.href = "/sumber";
        </script>
      `);
    }

    if (results.length > 0) {
      // Location name is already in use by another location, return an error message
      const errorMessage = "Nama sumber sudah digunakan oleh sumber lain.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.source.href = "/source";
        </script>
      `);
    } else {
      // Location name is not in use, proceed with the update
      connection.query(
        "UPDATE sumber SET nama_sumber = ? WHERE id = ?",
        [nama_sumber, sumberId],
        (error, results, fields) => {
          if (error) {
            const errorMessage = "Gagal mengedit sumber.";
            return res.send(`
              <script>
                alert("${errorMessage}");
                window.sumber.href = "/sumber";
              </script>
            `);
          }
          // Redirect ke halaman lokasi setelah mengedit data
          res.redirect("/sumber");
        }
      );
    }
  });
});

app.get("/sumber/delete/:id", (req, res) => {
  const sumberId = req.params.id;
  // Hapus data lokasi berdasarkan ID
  connection.query(
    "DELETE FROM sumber WHERE id = ?",
    [sumberId],
    (error, results, fields) => {
      if (error) throw error;
      // Redirect ke halaman lokasi setelah menghapus data
      res.redirect("/sumber");
    }
  );
});

// Menampilkan halaman aset

app.get("/laporan", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query(
      "SELECT *, nama_aset.nama_aset, lokasi.nama_lokasi, aset.id as id FROM aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id",
      (error, results) => {
        if (error) throw error;
        // Menampilkan halaman kategori dengan data kategori
        // console.log(results);
        res.render("admin/laporan", {
          aset: results,
          userName: req.session.username,
        });
      }
    );
  } else {
    res.redirect("/");
  }
});

// -------------------------------------------------USER-------------------------------------------------------------------

app.get("/dashboard/user", (req, res) => {
  if (req.session.loggedin) {
    const queryKategori =
      "SELECT LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) AS kategori, k.nama_kategori, SUM(a.jumlah) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori GROUP BY kategori, k.nama_kategori";

    const queryNilaiLokasi =
      "SELECT l.nama_lokasi AS lokasi, SUM(a.nilai) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori JOIN lokasi l ON a.id_lokasi = l.id GROUP BY lokasi";

    const querySumber =
      "SELECT a.sumber, SUM(a.jumlah) as total FROM aset a GROUP BY a.sumber";

    const queryTotalAset = "SELECT SUM(jumlah) as totalAset FROM aset";
    const queryTotalNilai = "SELECT SUM(nilai) as totalNilai FROM aset";

    connection.query(
      queryKategori,
      (errorKategori, resultsKategori, fieldsKategori) => {
        if (errorKategori) {
          throw errorKategori;
        }

        connection.query(
          queryNilaiLokasi,
          (errorNilaiLokasi, resultsNilaiLokasi, fieldsNilaiLokasi) => {
            if (errorNilaiLokasi) {
              throw errorNilaiLokasi;
            }

            connection.query(
              querySumber,
              (errorSumber, resultsSumber, fieldsSumber) => {
                if (errorSumber) {
                  throw errorSumber;
                }

                connection.query(
                  queryTotalAset,
                  (errorTotalAset, resultsTotalAset) => {
                    if (errorTotalAset) {
                      throw errorTotalAset;
                    }

                    connection.query(
                      queryTotalNilai,
                      (errorTotalNilai, resultsTotalNilai) => {
                        if (errorTotalNilai) {
                          throw errorTotalNilai;
                        }

                        // Ambil hasil query untuk total aset dan total nilai
                        const totalAset = resultsTotalAset[0].totalAset;
                        const totalNilai = resultsTotalNilai[0].totalNilai;

                        res.render("user/dashboard", {
                          dataKategori: resultsKategori,
                          dataNilaiLokasi: resultsNilaiLokasi,
                          dataSumber: resultsSumber,
                          totalAset: totalAset,
                          totalNilai: totalNilai,
                          userName: req.session.username,
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  } else {
    res.redirect("/");
  }
});

// Menampilkan halaman aset
app.get("/aset/user", (req, res) => {
  if (req.session.loggedin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query(
      "SELECT *, nama_aset.nama_aset, lokasi.nama_lokasi, aset.id as id FROM aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id",
      (error, results) => {
        if (error) throw error;
        // Menampilkan halaman kategori dengan data kategori
        // console.log(results);
        res.render("user/aset", {
          aset: results,
          userName: req.session.username,
        });
      }
    );
  } else {
    res.redirect("/");
  }
});

// Menampilkan halaman aset tambah
app.get("/aset/tambah/user", (req, res) => {
  if (req.session.loggedin) {
    // Mengambil data kategori dari basis data MySQL
    const sql = `SELECT * From nama_aset; SELECT * FROM lokasi; select * from sumber`;
    connection.query(sql, (error, results) => {
      if (error) throw error;
      res.render("user/aset-tambah", {
        aset: results[0],
        lokasi: results[1],
        sumber: results[2],
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

app.post("/aset/tambah/user", (req, res) => {
  if (req.session.loggedin) {
    const { lokasi, aset, nilai, jumlah, sumber, kondisi } = req.body;
    const checkAset = `select * from aset where id_aset = '${aset}'`;
    // const sql = `SELECT * FROM kategori WHERE nama_kategori = '${kategori}';SELECT MAX(id_kategori) AS lastIdKategori FROM kategori`;
    connection.query(checkAset, (error, results, fields) => {
      if (error) throw error;

      // Jika length > 1 berarti datanya ada
      // if (results.length > 0) {
      // Jika kategori sudah ada, kirim tanggapan ke client
      // UPDATE kategori SET id_kategori = ${idkategori}, nama_kategori = '${kategori}' WHERE id_kategori = ${categoryId}
      // console.log(results[0]);
      // const jumlahAsetSekarang = results[0];
      // const updateJumlah = 'UPDATE aset SET jumlah = '
      // } else {
      const insertQuery = `INSERT INTO aset (id_aset, nilai, jumlah, id_lokasi, sumber, kondisi) VALUES ('${aset}',${nilai}, ${jumlah}, ${lokasi}, '${sumber}', '${kondisi}')`;
      connection.query(insertQuery, (error, results, fields) => {
        if (error) throw error;
        console.log("Aset added successfully!");
        res.redirect("/aset/user");
      });
      // }
    });
  }
});

// Menampilkan halaman aset edit
app.get("/aset/edit/user/:id", (req, res) => {
  const id = req.params.id;
  if (req.session.loggedin) {
    // Mengambil data kategori dari basis data MySQL
    const sql = `SELECT * From nama_aset; select * from lokasi; select * from sumber; select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id JOIN sumber on aset.id_sumber = sumber.id WHERE aset.id = ${id}`;
    // const sql = `SELECT * From nama_aset; select * from lokasi; select * from sumber; select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id WHERE aset.id = ${id}`;

    connection.query(sql, (error, results) => {
      if (error) throw error;
      console.log(results[2][0]);
      const sumberLama = results[3][0].sumber;
      const jumlah = results[3][0].jumlah;
      const nilai = results[3][0].nilai;
      const kondisi = results[3][0].kondisi;
      const idAset = results[3][0].id_aset;
      const namaAset = results[3][0].nama_aset;
      const namaLokasi = results[3][0].nama_lokasi;
      const lokasiID = results[3][0].id_lokasi;
      // const sumberID = results[3][0].id_sumber
      // console.log(results[2][0]);
      res.render("user/aset-edit", {
        aset: results[0],
        lokasi: results[1],
        sumber: results[2],
        sumberLama,
        jumlah,
        nilai,
        kondisi,
        idAset,
        asetID: id,
        namaAset,
        namaLokasi,
        lokasiID,
        // sumberID
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Menangani permintaan untuk menyimpan perubahan aset yang telah diedit
app.post("/aset/edit/user/:id", (req, res) => {
  const asetID = req.params.id;
  const { lokasi, aset, nilai, jumlah, sumber, kondisi } = req.body;
  const query = `UPDATE aset SET id_lokasi = ${lokasi}, id_aset = '${aset}', nilai = ${nilai}, jumlah=${jumlah}, sumber = '${sumber}', kondisi = '${kondisi}' WHERE id = ${asetID}`;
  connection.query(query, (error, results) => {
    if (error) throw error;
    console.log("Aset updated successfully!");
    res.redirect("/aset/user");
  });
});

// Menampilkan aset detail
app.get("/aset/detail/user/:id", (req, res) => {
  const asetId = req.params.id;
  const query = `select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id WHERE aset.id = ${asetId}`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    res.render("user/detail-aset", {
      aset: results,
      userName: req.session.username,
    });
  });
});

// Endpoint untuk menangani hapus aset
app.get("/aset/delete/user/:id", (req, res) => {
  const asetId = req.params.id;
  const query = `DELETE FROM aset WHERE id = ${asetId}`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Aset deleted successfully!");
    res.redirect("/aset/user");
  });
});

// -------------------------------- JENIS USER -------------------------------- //

// Endpoint untuk menampilkan daftar jenis
app.get("/jenis/user", (req, res) => {
  if (req.session.loggedin) {
    connection.query("SELECT * FROM jenis", (error, results, fields) => {
      if (error) throw error;
      res.render("user/jenis", {
        jenis: results,
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Endpoint untuk menampilkan halaman tambah jenis
app.get("/jenis/tambah/user", (req, res) => {
  if (req.session.loggedin) {
    // Ambil id_jenis terbaru berdasarkan id_kategori
    // const getLastIdJenis = `SELECT MAX(id_jenis) AS lastIdJenis FROM jenis WHERE id_kategori=${idkategori}`
    // Mengambil data kategori dari basis data MySQL
    const selectKategori = "SELECT * FROM kategori";

    connection.query(selectKategori, (error, results) => {
      // console.log("Kategori: ", results[0]);
      // console.log("Id jenis: ", results[1]);
      if (error) {
        throw error;
      }
      // Menampilkan halaman kategori dengan data kategori
      res.render("user/jenis-tambah", {
        kategoris: results,
        userName: req.session.username,
      });
    });
  }
  // res.render("admin/jenis-tambah");
});

// Endpoint untuk menangani penambahan jenis
app.post("/jenis/tambah/user", (req, res) => {
  const { idkategori, jenis } = req.body;

  // Periksa apakah jenis sudah ada di database
  const checkJenisQuery = `SELECT * FROM jenis WHERE id_kategori = ${idkategori} AND nama_jenis = '${jenis}'`;

  connection.query(checkJenisQuery, (error, results) => {
    if (error) {
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan pada server." });
    }

    if (results.length > 0) {
      const errorMessage = "Jenis sudah ada di database.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/jenis/user";
        </script>
      `);
    }

    // Jika jenis belum ada, lakukan penambahan data jenis
    const getLastIdJenis = `SELECT MAX(id_jenis) AS lastIdJenis FROM jenis WHERE id_kategori = ${idkategori}`;

    connection.query(getLastIdJenis, (error, results, fields) => {
      if (error) {
        return res.status(400).json({ message: "ID Jenis Tidak Ditemukan." });
      }

      const lastIdJenis = results[0].lastIdJenis || 0;
      let splitIdJenis;
      if (typeof lastIdJenis === "string") {
        splitIdJenis = lastIdJenis.split(".")[1];
      }
      const newIdJenis =
        splitIdJenis === undefined
          ? parseInt(lastIdJenis) + 1
          : parseInt(splitIdJenis) + 1;
      const idJenis = `${idkategori}.${newIdJenis}`;
      const insertJenis = `INSERT INTO jenis (id_jenis, id_kategori, nama_jenis) VALUES ('${idJenis}', ${idkategori}, '${jenis}')`;

      connection.query(insertJenis, (error, results) => {
        if (error) {
          // return res.status(500).json({ message: "Gagal menambahkan jenis." });
          const failMessage = "Gagal menambahkan jenis";
          return res.send(`
            <script>
              alert("${failMessage}");
              window.location.href = "/jenis/user";
            </script>
          `);
        } else {
          const successMessage = "Jenis berhasil ditambahkan ke database.";
          return res.send(`
            <script>
              alert("${successMessage}");
              window.location.href = "/jenis/user";
            </script>
          `);
        }
      });
    });
  });
});

// Endpoint untuk menampilkan halaman edit jenis
app.get("/jenis/edit/user/:id", (req, res) => {
  const jenisId = req.params.id;
  connection.query(
    `SELECT * FROM jenis WHERE id_jenis = ${jenisId}`,
    (error, results, fields) => {
      if (error) throw error;
      // console.log(results[0].nama_jenis);
      res.render("user/jenis-edit", {
        nama_jenis: results[0].nama_jenis,
        id_jenis: results[0].id_jenis,
        userName: req.session.username,
      });
    }
  );
});

// Endpoint untuk menangani pengeditan jenis
app.post("/jenis/edit/user", (req, res) => {
  const { jenis, idJenis } = req.body;
  const query = `UPDATE jenis SET nama_jenis = '${jenis}' WHERE id_jenis = ${idJenis}`;

  connection.query(query, (error, results, fields) => {
    if (error) {
      // return res.status(500).send("Gagal mengedit jenis");
      throw error;
    }

    res.redirect("/jenis/user");
  });
});

app.get("/jenis/delete/user/:id", (req, res) => {
  const jenisId = req.params.id;
  const query = `DELETE FROM jenis WHERE id_jenis = ${jenisId}`;
  connection.query(query, (error, results, fields) => {
    if (error) {
      // Periksa apakah pesan kesalahan terkait dengan foreign key constraint
      if (error.errno === 1451) {
        const errorMessage =
          "Baris ini tidak dapat dihapus karena memiliki ketergantungan dengan tabel lain.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/jenis/user";
          </script>
        `);
      } else {
        const errorMessage = "Terjadi kesalahan saat menghapus kategori.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/jenis/user";
          </script>
        `);
      }
    } else {
      const successMessage = "Jenis berhasil dihapus.";
      res.send(`
        <script>
          alert("${successMessage}");
          window.location.href = "/jenis/user";
        </script>
      `);
    }
  });
});

// -------------------------------- NAMA ASET USER -------------------------------- //

// Endpoint untuk menampilkan daftar nama aset
app.get("/nama/aset/user", (req, res) => {
  if (req.session.loggedin) {
    connection.query("SELECT * FROM nama_aset", (error, results, fields) => {
      if (error) throw error;
      res.render("user/nama-aset", {
        nama_aset: results,
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("user/nama-aset");
  }
});

// Endpoint untuk menampilkan halaman tambah nama aset
app.get("/nama/aset/tambah/user", (req, res) => {
  if (req.session.loggedin) {
    // Ambil id_aset terbaru berdasarkan id_jenis
    // const getLastIdAset = `SELECT MAX(id_aset) AS lastIdAset FROM nama_aset WHERE id_jenis=${idjenis}`
    // Mengambil data kategori dari basis data MySQL
    // const selectKategori = "SELECT * FROM jenis";
    const selectJenis = "SELECT * FROM jenis";

    // const sql = "SELECT * FROM jenis; SELECT * FROM kategori";
    connection.query(selectJenis, (error, results) => {
      // console.log(results[1]);
      // console.log(data);
      if (error) {
        throw error;
      }
      // Menampilkan halaman jenis dengan data jenis
      res.render("user/nama-aset-tambah", {
        jenis: results,
        userName: req.session.username,
      });
    });
  }
  // res.render("admin/nama-aset-tambah");
});

// Endpoint untuk menangani penambahan nama aset
app.post("/nama/aset/tambah/user", upload.single("aset-file"), (req, res) => {
  // Ambil payload dari body
  const { idJenis, aset } = req.body;
  const imgDestination = req.file.destination;
  const imgDestination2 = imgDestination.replace(/\./g, "");
  const imgName = req.file.filename;
  const imgUrl = `${imgDestination2}/${imgName}`;
  // console.log(imgUrl);

  // Ambil id aset terakhir
  const getLastIdAset = `SELECT MAX(id_aset) AS lastIdAset FROM nama_aset WHERE id_jenis = ${idJenis}`;
  const sql = `SELECT MAX(id_aset) AS lastIdAset FROM nama_aset WHERE id_jenis = ${idJenis}; SELECT COUNT(*) as count from nama_aset WHERE nama_aset = '${aset}'`;

  connection.query(sql, (error, results, fields) => {
    if (error) {
      res.status(400).json({ msg: "ID Aset Tidak Ditemukan" });
    } else {
      const lastIdAset = results[0][0].lastIdAset || 0;
      let splitIdAset;
      if (typeof lastIdAset === "string") {
        splitIdAset = lastIdAset.split(".")[2];
      }

      // const newIdAset = parseInt(splitIdAset) + 1;
      const newIdAset =
        splitIdAset === undefined
          ? parseInt(lastIdAset) + 1
          : parseInt(splitIdAset) + 1;
      const idAset = `${idJenis}.${newIdAset}`;
      const id_kategori = idJenis.split(".")[0];
      const cekNamaAset = results[1][0].count;
      if (cekNamaAset > 0) {
        const errorMessage = "Nama Aset Sudah Digunakan.";
        res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/nama/aset/tambah/user";
          </script>
        `);
      } else {
        const insertAset = `INSERT INTO nama_aset (id_aset, id_kategori, id_jenis, nama_aset, images) values ('${idAset}', ${parseInt(
          id_kategori
        )}, '${idJenis}', '${aset}', '${imgUrl}')`;
        connection.query(insertAset, (error, results) => {
          if (error) {
            return res.status(500).json({ msg: error.message });
          } else {
            // res.status(201).json({ msg: "Berhasil tambah jenis", data: results });
            res.redirect("/nama/aset/user");
          }
        });
      }
    }
  });
});

// Endpoint untuk menampilkan halaman edit nama aset
app.get("/nama/aset/edit/user/:id", (req, res) => {
  const asetId = req.params.id;
  connection.query(
    `SELECT * FROM nama_aset WHERE id_aset = '${asetId}'`,
    (error, results, fields) => {
      if (error) throw error;
      // console.log(results[0].nama_jenis);
      res.render("user/nama-aset-edit", {
        nama_aset: results[0].nama_aset,
        img: results[0].images,
        id_aset: results[0].id_aset,
        userName: req.session.username,
      });
    }
  );
});

// Endpoint untuk menangani halaman edit nama aset
app.post("/nama/aset/edit/user", (req, res) => {
  const { nama_aset, idAset } = req.body;

  // Check if the new asset name is already in use by another asset
  const checkExistingQuery = `SELECT * FROM nama_aset WHERE nama_aset = '${nama_aset}' AND id_aset != '${idAset}'`;

  connection.query(checkExistingQuery, (error, results) => {
    if (error) {
      const errorMessage = "Terjadi kesalahan pada server.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/nama/aset";
        </script>
      `);
    }

    if (results.length > 0) {
      // Asset name is already in use by another asset, return an error message
      const errorMessage = "Nama aset sudah digunakan oleh aset lain.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/nama/aset";
        </script>
      `);
    } else {
      // Asset name is not in use, proceed with the update
      const updateQuery = `UPDATE nama_aset SET nama_aset = '${nama_aset}' WHERE id_aset = '${idAset}'`;

      connection.query(updateQuery, (error, results, fields) => {
        if (error) {
          const errorMessage = "Gagal mengedit aset.";
          return res.send(`
            <script>
              alert("${errorMessage}");
              window.location.href = "/nama/aset";
            </script>
          `);
        }
        // Redirect to the asset page after editing data
        res.redirect("/nama/aset/user");
      });
    }
  });
});

app.get("/nama/aset/delete/user/:id", (req, res) => {
  const asetId = req.params.id;

  // Langkah 1: Periksa keterkaitan data
  const checkQuery = `SELECT * FROM aset WHERE id_aset = '${asetId}'`;

  connection.query(checkQuery, (checkError, checkResults, checkFields) => {
    if (checkError) throw checkError;

    // Jika masih ada keterkaitan data, beri pesan kesalahan ke pengguna
    if (checkResults.length > 0) {
      const errorMessage =
        "Nama aset tidak dapat dihapus karena masih digunakan di tempat lain.";
      res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/nama/aset/user";
        </script>
      `);
    } else {
      // Jika tidak ada keterkaitan data, lanjutkan dengan penghapusan
      const deleteQuery = `DELETE FROM nama_aset WHERE id_aset = '${asetId}'`;

      connection.query(
        deleteQuery,
        (deleteError, deleteResults, deleteFields) => {
          if (deleteError) throw deleteError;

          const successMessage = "Nama aset berhasil dihapus.";
          res.send(`
          <script>
            alert("${successMessage}");
            window.location.href = "/nama/aset/user";
          </script>
        `);
        }
      );
    }
  });
});

// -------------------------------- LOKASI USER -------------------------------- //

// Menampilkan halaman lokasi
app.get("/lokasi/user", (req, res) => {
  if (req.session.loggedin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query("SELECT * FROM lokasi", (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("user/lokasi", {
        lokasi: results,
        userName: req.session.username,
      });
    });
  } else {
    res.redirect("/");
  }
});

// Menampilkan tampilan tambah lokasi (GET request)
app.get("/lokasi/tambah/user", (req, res) => {
  res.render("user/lokasi-tambah", { userName: req.session.username }); // Ganti "tambah-kategori" dengan nama file EJS Anda
});

// // Handle POST request to add a new location
// app.post("/lokasi/tambah", (req, res) => {
//   if (req.session.isadmin) {
//     const lokasi = req.body.Lokasi;
//     const query = `INSERT INTO lokasi (nama_lokasi) VALUES ('${lokasi}')`;

//     connection.query(query, (error, results, fields) => {
//       if (error) {
//         return res.status(500).send("Gagal menambah lokasi baru");
//       }

//       res.redirect("/lokasi");
//     });
//   } else {
//     res.redirect("/");
//   }
// });

// Handle POST request to add a new location

app.post("/lokasi/tambah/user", (req, res) => {
  if (req.session.loggedin) {
    const lokasi = req.body.Lokasi;

    // Check if the location already exists in the database
    const checkExistingQuery = `SELECT * FROM lokasi WHERE nama_lokasi = '${lokasi}'`;

    connection.query(checkExistingQuery, (error, results) => {
      if (error) {
        const errorMessage = "Terjadi kesalahan pada server.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/lokasi/user";
          </script>
        `);
      }

      if (results.length > 0) {
        // Location already exists, return an error message
        const errorMessage = "Lokasi sudah ada di database.";
        return res.send(`
          <script>
            alert("${errorMessage}");
            window.location.href = "/lokasi/user";
          </script>
        `);
      } else {
        // Location doesn't exist, proceed with the insertion
        const insertQuery = `INSERT INTO lokasi (nama_lokasi) VALUES ('${lokasi}')`;

        connection.query(insertQuery, (error, results, fields) => {
          if (error) {
            const errorMessage = "Gagal menambah lokasi baru.";
            return res.send(`
              <script>
                alert("${errorMessage}");
                window.location.href = "/lokasi/user";
              </script>
            `);
          }

          res.redirect("/lokasi/user");
        });
      }
    });
  } else {
    res.redirect("/lokasi/user");
  }
});

app.get("/lokasi/edit/user/:id", (req, res) => {
  const lokasiId = req.params.id;
  // Query data lokasi berdasarkan ID
  connection.query(
    "SELECT * FROM lokasi WHERE id = ?",
    [lokasiId],
    (error, results, fields) => {
      if (error) throw error;
      // Kirim data lokasi yang akan diedit ke halaman edit
      res.render("user/lokasi-edit", {
        lokasi: results[0],
        userName: req.session.username,
      });
    }
  );
});

app.post("/lokasi/edit/user/:id", (req, res) => {
  const lokasiId = req.params.id;
  const { nama_lokasi } = req.body;

  // Check if the new location name is already in use by another location
  const checkExistingQuery = `SELECT * FROM lokasi WHERE nama_lokasi = '${nama_lokasi}' AND id != ${lokasiId}`;

  connection.query(checkExistingQuery, (error, results) => {
    if (error) {
      const errorMessage = "Terjadi kesalahan pada server.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/lokasi/user";
        </script>
      `);
    }

    if (results.length > 0) {
      // Location name is already in use by another location, return an error message
      const errorMessage = "Nama lokasi sudah digunakan oleh lokasi lain.";
      return res.send(`
        <script>
          alert("${errorMessage}");
          window.location.href = "/lokasi/user";
        </script>
      `);
    } else {
      // Location name is not in use, proceed with the update
      connection.query(
        "UPDATE lokasi SET nama_lokasi = ? WHERE id = ?",
        [nama_lokasi, lokasiId],
        (error, results, fields) => {
          if (error) {
            const errorMessage = "Gagal mengedit lokasi.";
            return res.send(`
              <script>
                alert("${errorMessage}");
                window.location.href = "/lokasi/user";
              </script>
            `);
          }
          // Redirect ke halaman lokasi setelah mengedit data
          res.redirect("/lokasi/user");
        }
      );
    }
  });
});

app.get("/lokasi/delete/user/:id", (req, res) => {
  const lokasiId = req.params.id;
  // Hapus data lokasi berdasarkan ID
  connection.query(
    "DELETE FROM lokasi WHERE id = ?",
    [lokasiId],
    (error, results, fields) => {
      if (error) throw error;
      // Redirect ke halaman lokasi setelah menghapus data
      res.redirect("/lokasi/user");
    }
  );
});

// -----------------------------------------------------LAPORAN-----------------------------------------------------

// Menampilkan halaman laporan
app.get("/laporan/user", (req, res) => {
  if (req.session.loggedin) {
    // Mengambil data dari basis data MySQL
    connection.query(
      "SELECT *, nama_aset.nama_aset, lokasi.nama_lokasi, aset.id as id FROM aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id",
      (error, results) => {
        if (error) throw error;

        // console.log(results);
        res.render("user/laporan", {
          aset: results,
          userName: req.session.username,
        });
      }
    );
  } else {
    res.redirect("/");
  }
});

// const fs = require("fs");
// const path = require("path");

// app.get("/generatePDF", (req, res, next) => {
//   const html = fs.readFileSync(
//     path.join(__dirname, "./views/admin/template/aset.html", "utf-8")
//   );
//   const filename = Math.random() + "_doc" + ".pdf";

//   let array = [];

//   // query ambil data

//   const obj = {
//     asetList: array,
//   };
//   const document = {
//     html: html,
//     data: { assets: obj },
//     path: "./" + filename,
//   };
//   pdf
//     .create(document, options)
//     .then((res) => {
//       console.log(res);
//     })
//     .catch((err) => {
//       console.log(err);
//     });
//   const filepath = `http://localhost:${port}/docs/${filename}`;
// });

const fs = require("fs");
const puppeteer = require("puppeteer");
const ExcelJS = require("exceljs");
// const cheerio = require("cheerio");
// const path = require("path");
const ejs = require("ejs");
const html2canvas = require("html2canvas");

const calculateTotal = (results) => {
  let totalJumlah = 0;
  let totalNilai = 0;

  results.forEach((aset) => {
    totalJumlah += aset.jumlah;
    totalNilai += aset.nilai;
  });

  return { totalJumlah, totalNilai };
};

const generatePDF = async (res, htmlContent, laporan) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);

    // Format created_at before adding it to the PDF
    const formattedHtmlContent = htmlContent.replace(
      /aset\.created_at/g,
      "new Date(aset.created_at).toLocaleDateString()"
    );

    await page.setContent(formattedHtmlContent);

    const pdfBuffer = await page.pdf();
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=report_${laporan}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating PDF");
  }
};

const generateExcel = async (
  res,
  results,
  totalJumlah,
  totalNilai,
  reportHeader,
  laporan
) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Aset");

    const headerRow = worksheet.addRow(reportHeader);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "DDDDDD" },
    };

    // Setel lebar kolom
    for (let i = 1; i <= reportHeader.length; i++) {
      worksheet.getColumn(i).width = 30;
    }

    // Tambahkan data ke lembar kerja
    let currentLocation = null;
    let currentCategory = null;
    let currentType = null;

    let totalJumlahLocation = 0;
    let totalNilaiLocation = 0;

    let totalJumlahCategory = 0;
    let totalNilaiCategory = 0;

    let totalJumlahType = 0;
    let totalNilaiType = 0;

    results.forEach((aset) => {
      // Tambahkan subtotal untuk lokasi sebelumnya
      if (currentLocation !== aset.nama_lokasi) {
        if (currentLocation !== null) {
          const subtotalRow = worksheet.addRow([
            "", // Kolom pertama tetap kosong untuk indentasi
            `Total ${currentLocation} :`,
            totalJumlahLocation ? totalJumlahLocation.toString() : "", // Periksa apakah totalJumlahLocation terdefinisi
            "",
            "",
            totalNilaiLocation ? totalNilaiLocation.toString() : "", // Periksa apakah totalNilaiLocation terdefinisi
            "",
          ]);
          subtotalRow.font = { bold: true };
          subtotalRow.alignment = { horizontal: "left" };

          // Reset total untuk lokasi baru
          totalJumlahLocation = 0;
          totalNilaiLocation = 0;
        }

        // Mulai grup baru untuk lokasi saat ini
        const groupRow = worksheet.addRow([
          aset.nama_lokasi,
          "",
          "",
          "",
          "",
          "",
        ]);
        groupRow.font = { bold: true };
        groupRow.alignment = { horizontal: "left" };

        currentLocation = aset.nama_lokasi;
      }

      // Tambahkan subtotal untuk kategori sebelumnya
      if (currentCategory !== aset.nama_kategori) {
        if (currentCategory !== null) {
          const subtotalRow = worksheet.addRow([
            "",
            `Total ${currentCategory} :`,
            totalJumlahCategory ? totalJumlahCategory.toString() : "", // Periksa apakah totalJumlahCategory terdefinisi
            "",
            "",
            totalNilaiCategory ? totalNilaiCategory.toString() : "", // Periksa apakah totalNilaiCategory terdefinisi
            "",
          ]);
          subtotalRow.font = { bold: true };
          subtotalRow.alignment = { horizontal: "left" };

          // Reset total untuk kategori baru
          totalJumlahCategory = 0;
          totalNilaiCategory = 0;
        }

        // Mulai grup baru untuk kategori saat ini
        const groupRow = worksheet.addRow([
          aset.nama_kategori,
          "",
          "",
          "",
          "",
          "",
        ]);
        groupRow.font = { bold: true };
        groupRow.alignment = { horizontal: "left" };

        currentCategory = aset.nama_kategori;
      }

      // Tambahkan subtotal untuk jenis sebelumnya
      if (currentType !== aset.nama_jenis) {
        if (currentType !== null) {
          const subtotalRow = worksheet.addRow([
            "",
            "",
            `Total ${currentType} :`,
            totalJumlahType ? totalJumlahType.toString() : "", // Periksa apakah totalJumlahType terdefinisi
            "",
            "",
            totalNilaiType ? totalNilaiType.toString() : "", // Periksa apakah totalNilaiType terdefinisi
            "",
          ]);
          subtotalRow.font = { bold: true };
          subtotalRow.alignment = { horizontal: "left" };

          // Reset total untuk jenis baru
          totalJumlahType = 0;
          totalNilaiType = 0;
        }

        // Mulai grup baru untuk jenis saat ini
        const groupRow = worksheet.addRow([
          aset.nama_jenis,
          "",
          "",
          "",
          "",
          "",
        ]);
        groupRow.font = { bold: true };
        groupRow.alignment = { horizontal: "left" };
        groupRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "DDDDDD" }, // Warna abu-abu
        };

        currentType = aset.nama_jenis;
      }

      // Tambahkan baris aset
      const row = worksheet.addRow([
        "", // Kolom pertama tetap kosong untuk indentasi
        aset.id_aset,
        aset.nama_aset,
        aset.jumlah,
        aset.nilai,
        aset.created_at,
      ]);

      row.alignment = { horizontal: "left" };

      // Perbarui total untuk setiap kategori
      totalJumlahLocation += aset.jumlah;
      totalNilaiLocation += aset.nilai;

      totalJumlahCategory += aset.jumlah;
      totalNilaiCategory += aset.nilai;

      totalJumlahType += aset.jumlah;
      totalNilaiType += aset.nilai;
    });

    // Tambahkan subtotal untuk lokasi terakhir
    if (currentLocation !== null) {
      const subtotalRow = worksheet.addRow([
        "", // Kolom pertama tetap kosong untuk indentasi
        `Total ${currentLocation} :`,
        totalJumlahLocation ? totalJumlahLocation.toString() : "", // Periksa apakah totalJumlahLocation terdefinisi
        "",
        "",
        totalNilaiLocation ? totalNilaiLocation.toString() : "", // Periksa apakah totalNilaiLocation terdefinisi
        "",
      ]);
      subtotalRow.font = { bold: true };
      subtotalRow.alignment = { horizontal: "left" };
    }

    // Tambahkan subtotal untuk kategori terakhir
    if (currentCategory !== null) {
      const subtotalRow = worksheet.addRow([
        "",
        `Total ${currentCategory} :`,
        totalJumlahCategory ? totalJumlahCategory.toString() : "", // Periksa apakah totalJumlahCategory terdefinisi
        "",
        "",
        totalNilaiCategory ? totalNilaiCategory.toString() : "", // Periksa apakah totalNilaiCategory terdefinisi
        "",
      ]);
      subtotalRow.font = { bold: true };
      subtotalRow.alignment = { horizontal: "left" };
    }

    // Tambahkan subtotal untuk jenis terakhir
    if (currentType !== null) {
      const subtotalRow = worksheet.addRow([
        "",
        "",
        `Total ${currentType} :`,
        totalJumlahType ? totalJumlahType.toString() : "", // Periksa apakah totalJumlahType terdefinisi
        "",
        "",
        totalNilaiType ? totalNilaiType.toString() : "", // Periksa apakah totalNilaiType terdefinisi
        "",
      ]);
      subtotalRow.font = { bold: true };
      subtotalRow.alignment = { horizontal: "left" };
    }

    // Tambahkan total jumlah dan total nilai ke lembar kerja
    const totalJumlahRow = worksheet.addRow([
      "Total Keseluruhan :",
      totalJumlah ? totalJumlah.toString() : "", // Periksa apakah totalJumlah terdefinisi
      "",
      "",
      totalNilai ? totalNilai.toString() : "", // Periksa apakah totalNilai terdefinisi
      "",
    ]);

    totalJumlahRow.font = { bold: true };
    totalJumlahRow.alignment = { horizontal: "left" };

    // Hasilkan file Excel dan kirim sebagai respons HTTP
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=data_aset_${laporan}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating Excel");
  }
};

app.get("/generateReport", async (req, res) => {
  try {
    const { startDate, endDate, format, laporan } = req.query;

    // Validasi Format Tanggal
    const isValidDateFormat = (dateString) => {
      const regex = /^\d{4}-\d{2}-\d{2}$/;
      return regex.test(dateString);
    };

    // Pastikan Tanggal Mulai Kurang dari atau Sama dengan Tanggal Akhir
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      return res.status(400).send("Invalid date format");
    }

    if (startDateObj > endDateObj) {
      return res
        .status(400)
        .send("Start date must be before or equal to end date");
    }

    // Batasi Rentang Tanggal
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Batas maksimal 30 hari dari tanggal saat ini

    const selectedEndDateObj = new Date(endDate);

    if (selectedEndDateObj > maxDate) {
      return res.status(400).send("Date range exceeds maximum allowed");
    }

    // Buat SQL Query berdasarkan rentang tanggal dan jenis laporan
    let sqlQuery = "";
    let reportHeader = [];
    let templateFileName = "";

    if (laporan === "lokasi") {
      sqlQuery = `
        SELECT
          aset.id_aset,
          lokasi.nama_lokasi,
          nama_aset.nama_aset,
          aset.jumlah,
          aset.nilai,
          aset.created_at
        FROM aset
        JOIN nama_aset ON aset.id_aset = nama_aset.id_aset
        JOIN lokasi ON aset.id_lokasi = lokasi.id
        WHERE aset.created_at BETWEEN '${startDate}' AND '${endDate}';
      `;
      reportHeader = [
        "Lokasi",
        "ID Aset",
        "Nama Aset",
        "Jumlah",
        "Nilai",
        "Dibuat pada",
      ];
      templateFileName = "perLokasi";
    } else if (laporan === "kategori") {
      // Tambahkan query dan header untuk laporan per kategori
      sqlQuery = `
      SELECT
      aset.id_aset,
      kategori.nama_kategori,
      nama_aset.nama_aset,
      aset.jumlah,
      aset.nilai,
      aset.created_at
    FROM aset
    JOIN nama_aset ON aset.id_aset = nama_aset.id_aset
    JOIN kategori ON nama_aset.id_kategori = kategori.id_kategori
        WHERE aset.created_at BETWEEN '${startDate}' AND '${endDate}';
      `;
      reportHeader = [
        "Nama Kategori",
        "ID Aset",
        "Nama Aset",
        "Jumlah",
        "Nilai",
        "Dibuat pada",
      ];
      templateFileName = "perKategori";
    } else if (laporan === "jenis") {
      // Tambahkan query dan header untuk laporan per jenis
      sqlQuery = `
        SELECT
          aset.id_aset,
          jenis.nama_jenis,
          nama_aset.nama_aset,
          aset.jumlah,
          aset.nilai,
          aset.created_at
        FROM aset
        JOIN nama_aset ON aset.id_aset = nama_aset.id_aset
        JOIN jenis ON nama_aset.id_jenis = jenis.id_jenis
        WHERE aset.created_at BETWEEN '${startDate}' AND '${endDate}';
      `;
      reportHeader = [
        "Nama Jenis",
        "ID Aset",
        "Nama Aset",
        "Jumlah",
        "Nilai",
        "Dibuat pada",
      ];
      templateFileName = "perJenis";
    } else {
      return res.status(400).send("Invalid report type");
    }

    const results = await new Promise((resolve, reject) => {
      connection.query(sqlQuery, (error, results, fields) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    // Hitung total jumlah dan nilai
    const { totalJumlah, totalNilai } = calculateTotal(results);

    // Baca template HTML dari file
    const template = fs.readFileSync(
      path.join(
        __dirname,
        "views",
        "admin",
        "template",
        `${templateFileName}.ejs`
      ),
      "utf-8"
    );

    // Render template dengan data menggunakan EJS
    const htmlContent = ejs.render(template, {
      aset: results,
      totalJumlah: totalJumlah,
      totalNilai: totalNilai,
      reportHeader: reportHeader,
    });

    // Generate report berdasarkan format yang dipilih
    if (format === "pdf") {
      generatePDF(res, htmlContent, templateFileName);
    } else if (format === "excel") {
      generateExcel(
        res,
        results,
        totalJumlah,
        totalNilai,
        reportHeader,
        templateFileName
      );
    } else {
      res.status(400).send("Invalid format");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.listen(port, () => {
  console.log("Server started at port " + port);
  console.log("http://localhost:" + port);
});
