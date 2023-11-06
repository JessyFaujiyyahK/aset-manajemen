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

// app.get("/dashboard/admin", (req, res) => {
//   if (req.session.isadmin) {
//     const query =
//       "SELECT LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) AS kategori, k.nama_kategori, SUM(a.jumlah) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori GROUP BY kategori, k.nama_kategori";

//     connection.query(query, (error, results, fields) => {
//       if (error) {
//         throw error;
//       }
//       // Render halaman dashboard.ejs dengan data yang diberikan
//       res.render("admin/dashboard", { data: results });
//     });
//   } else {
//     res.redirect("/");
//   }
// });

app.get("/dashboard/admin", (req, res) => {
  if (req.session.isadmin) {
    const queryKategori =
      "SELECT LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) AS kategori, k.nama_kategori, SUM(a.jumlah) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori GROUP BY kategori, k.nama_kategori";

    const queryNilaiLokasi =
      "SELECT a.nilai, l.nama_lokasi AS lokasi, SUM(a.nilai) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori JOIN lokasi l ON a.id_lokasi = l.id GROUP BY a.nilai, lokasi";

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

// Menampilkan halaman aset
app.get("/aset", (req, res) => {
  if (req.session.isadmin) {
    // Mengambil data kategori dari basis data MySQL
    connection.query(
      "SELECT *, nama_aset.nama_aset, lokasi.nama_lokasi, aset.id as id FROM aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id",
      (error, results) => {
        if (error) throw error;
        // Menampilkan halaman kategori dengan data kategori
        // console.log(results);
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
    const sql = `SELECT * From nama_aset; SELECT * FROM lokasi`;
    connection.query(sql, (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("admin/aset-tambah", {
        aset: results[0],
        lokasi: results[1],
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
    const sql = `SELECT * From nama_aset; select * from lokasi; select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id WHERE aset.id = ${id}`;

    connection.query(sql, (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      console.log(results[2][0]);
      const sumber = results[2][0].sumber;
      const jumlah = results[2][0].jumlah;
      const nilai = results[2][0].nilai;
      const kondisi = results[2][0].kondisi;
      const idAset = results[2][0].id_aset;
      const namaAset = results[2][0].nama_aset;
      const namaLokasi = results[2][0].nama_lokasi;
      const lokasiID = results[2][0].id_lokasi;
      // console.log(results[2][0]);
      res.render("admin/aset-edit", {
        aset: results[0],
        lokasi: results[1],
        sumber,
        jumlah,
        nilai,
        kondisi,
        idAset,
        asetID: id,
        namaAset,
        namaLokasi,
        lokasiID,
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
  const query = `UPDATE kategori SET id_kategori = ${idkategori}, nama_kategori = '${kategori}' WHERE id_kategori = ${categoryId}`;
  connection.query(query, (error, results) => {
    if (error) throw error;
    console.log("Category updated successfully!");
    res.redirect("/kategori");
  });
});

// Handle GET request to delete a category
// app.get("/kategori/delete/:id", (req, res) => {
//   const categoryId = req.params.id;
//   const query = `DELETE FROM kategori WHERE id_kategori = ${categoryId}`;
//   connection.query(query, (error, results, fields) => {
//     if (error) throw error;
//     console.log("Category deleted successfully!");
//     res.redirect("/kategori");
//   });
// });
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

// // Endpoint untuk menangani penambahan jenis
// app.post("/jenis/tambah", (req, res) => {
//   // Ambil payload dari body
//   const { idkategori, jenis } = req.body;

//   // Ambil id jenis terakhir
//   const getLastIdJenis = `SELECT MAX(id_jenis) AS lastIdJenis FROM jenis WHERE id_kategori = ${idkategori}`;

//   connection.query(getLastIdJenis, (error, results, fields) => {
//     if (error) {
//       res.status(400).json({ msg: "ID Jenis Tidak Ditemukan" });
//     } else {
//       /*
//       Ambil idJenis => diambil dari payload body
//       ambil lastIdAset => diambil dari query
//       newIdAset = parseint + 1
//       tambah idjenis dengan idasetbaru => ${idjeins}.${idAset}
//       insert query buat ke table aset
//       */
//       const lastIdJenis = results[0].lastIdJenis || 0;
//       let splitIdJenis;
//       if (typeof lastIdJenis === "string") {
//         splitIdJenis = lastIdJenis.split(".")[1];
//       }
//       // console.log("type: ", typeof splitIdJenis);
//       // console.log("value: ", splitIdJenis);
//       const newIdJenis =
//         splitIdJenis === undefined
//           ? parseInt(lastIdJenis) + 1
//           : parseInt(splitIdJenis) + 1;
//       const idJenis = `${idkategori}.${newIdJenis}`;
//       const insertJenis = `INSERT INTO jenis (id_jenis, id_kategori, nama_jenis) values ('${idJenis}', ${idkategori}, '${jenis}')`;

//       connection.query(insertJenis, (error, results) => {
//         if (error) {
//           return res.status(500).json({ msg: error.message });
//         } else {
//           // res.status(201).json({ msg: "Berhasil tambah jenis", data: results });
//           res.redirect("/jenis");
//         }
//       });
//     }
//     // res.redirect("/jenis");
//   });
// });

// app.post("/jenis/tambah", (req, res) => {
//   const { idkategori, jenis } = req.body;

//   // Periksa apakah jenis sudah ada di database
//   const checkJenisQuery = `SELECT * FROM jenis WHERE id_kategori = ${idkategori} AND nama_jenis = '${jenis}'`;

//   connection.query(checkJenisQuery, (error, results) => {
//     if (error) {
//       return res
//         .status(500)
//         .json({ message: "Terjadi kesalahan pada server." });
//     }

//     // Jika jenis sudah ada, kirim notifikasi alert ke klien
//     if (results.length > 0) {
//       return res.status(400).json({ message: "Jenis sudah ada di database." });
//     }

//     // Jika jenis belum ada, lakukan penambahan data jenis
//     const getLastIdJenis = `SELECT MAX(id_jenis) AS lastIdJenis FROM jenis WHERE id_kategori = ${idkategori}`;

//     connection.query(getLastIdJenis, (error, results, fields) => {
//       if (error) {
//         return res.status(400).json({ message: "ID Jenis Tidak Ditemukan." });
//       }

//       const lastIdJenis = results[0].lastIdJenis || 0;
//       let splitIdJenis;
//       if (typeof lastIdJenis === "string") {
//         splitIdJenis = lastIdJenis.split(".")[1];
//       }
//       const newIdJenis =
//         splitIdJenis === undefined
//           ? parseInt(lastIdJenis) + 1
//           : parseInt(splitIdJenis) + 1;
//       const idJenis = `${idkategori}.${newIdJenis}`;
//       const insertJenis = `INSERT INTO jenis (id_jenis, id_kategori, nama_jenis) VALUES ('${idJenis}', ${idkategori}, '${jenis}')`;

//       connection.query(insertJenis, (error, results) => {
//         if (error) {
//           return res.status(500).json({ message: "Gagal menambahkan jenis." });
//         } else {
//           return res
//             .status(200)
//             .json({ message: "Berhasil menambahkan jenis." });
//         }
//       });
//     });
//   });
// });

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
          return res.status(500).json({ message: "Gagal menambahkan jenis." });
        } else {
          return res
            .status(200)
            .json({ message: "Berhasil menambahkan jenis." });
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
app.post("/nama/aset/tambah", (req, res) => {
  // Ambil payload dari body
  const { idJenis, aset } = req.body;

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
        const insertAset = `INSERT INTO nama_aset (id_aset, id_kategori, id_jenis, nama_aset) values ('${idAset}', ${parseInt(
          id_kategori
        )}, '${idJenis}', '${aset}')`;
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
    // res.redirect("/jenis");
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
        id_aset: results[0].id_aset,
        userName: req.session.username,
      });
    }
  );
});

// Endpoint untuk menangani pengeditan jenis
app.post("/nama/aset/edit", (req, res) => {
  const { nama_aset, idAset } = req.body; // Pastikan variabel ini adalah string
  const query = `UPDATE nama_aset SET nama_aset = '${nama_aset}' WHERE id_aset = '${idAset}'`; // Gunakan tanda kutip satu di sekitar idAset
  connection.query(query, (error, results, fields) => {
    if (error) {
      throw error;
    }

    res.redirect("/nama/aset");
  });
});

// Endpoint untuk menangani hapus jenis
app.get("/nama/aset/delete/:id", (req, res) => {
  const asetId = req.params.id;
  const query = `DELETE FROM nama_aset WHERE id_aset = '${asetId}'`; // Gunakan tanda kutip satu di sekitar asetId
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Aset deleted successfully!");
    res.redirect("/nama/aset");
  });
});

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

// --------------------------------------------------------------------------------------------------------------------

app.get("/dashboard/user", (req, res) => {
  if (req.session.loggedin) {
    const queryKategori =
      "SELECT LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) AS kategori, k.nama_kategori, SUM(a.jumlah) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori GROUP BY kategori, k.nama_kategori";

    const queryNilaiLokasi =
      "SELECT a.nilai, l.nama_lokasi AS lokasi, SUM(a.nilai) as total FROM aset a JOIN kategori k ON LEFT(a.id_aset, LOCATE('.', a.id_aset) - 1) = k.id_kategori JOIN lokasi l ON a.id_lokasi = l.id GROUP BY a.nilai, lokasi";

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
    const sql = `SELECT * From nama_aset; SELECT * FROM lokasi`;
    connection.query(sql, (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      res.render("user/aset-tambah", {
        aset: results[0],
        lokasi: results[1],
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
        res.redirect("/aset");
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
    const sql = `SELECT * From nama_aset; select * from lokasi; select * from aset JOIN nama_aset ON aset.id_aset=nama_aset.id_aset JOIN lokasi ON aset.id_lokasi=lokasi.id WHERE aset.id = ${id}`;

    connection.query(sql, (error, results) => {
      if (error) throw error;
      // Menampilkan halaman kategori dengan data kategori
      console.log(results[2][0]);
      const sumber = results[2][0].sumber;
      const jumlah = results[2][0].jumlah;
      const nilai = results[2][0].nilai;
      const kondisi = results[2][0].kondisi;
      const idAset = results[2][0].id_aset;
      const namaAset = results[2][0].nama_aset;
      const namaLokasi = results[2][0].nama_lokasi;
      const lokasiID = results[2][0].id_lokasi;
      // console.log(results[2][0]);
      res.render("user/aset-edit", {
        aset: results[0],
        lokasi: results[1],
        sumber,
        jumlah,
        nilai,
        kondisi,
        idAset,
        asetID: id,
        namaAset,
        namaLokasi,
        lokasiID,
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
app.get("/aset/delete/:id", (req, res) => {
  const asetId = req.params.id;
  const query = `DELETE FROM aset WHERE id = ${asetId}`;
  connection.query(query, (error, results, fields) => {
    if (error) throw error;
    console.log("Aset deleted successfully!");
    res.redirect("/aset");
  });
});

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
// const htmlToXlsx = require("html-to-xlsx");
const cheerio = require("cheerio");
const path = require("path");
const ejs = require("ejs");

// Kueri SQL untuk mengambil data dari tabel aset dan nama_aset menggunakan JOIN
const sqlQuery =
  "SELECT aset.id_aset, nama_aset.nama_aset, aset.jumlah, aset.nilai, aset.id_lokasi, lokasi.nama_lokasi FROM aset JOIN nama_aset ON aset.id_aset = nama_aset.id_aset JOIN lokasi ON aset.id_lokasi = lokasi.id";

app.get("/generatePDF", async (req, res) => {
  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(sqlQuery, (error, results, fields) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    // Baca template HTML dari file
    const template = fs.readFileSync(
      path.join(__dirname, "views", "admin", "template", "aset.ejs"),
      "utf-8"
    );

    // Menghitung total jumlah dan total nilai dari data aset
    let totalJumlah = 0;
    let totalNilai = 0;
    results.forEach((aset) => {
      totalJumlah += aset.jumlah;
      totalNilai += aset.nilai;
    });

    // Render template dengan data menggunakan EJS
    const htmlContent = ejs.render(template, {
      aset: results,
      totalJumlah: totalJumlah,
      totalNilai: totalNilai,
    });

    // Menggunakan Puppeteer dengan async/await
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);

    // Membuat file PDF dari konten halaman
    const pdfBuffer = await page.pdf();

    // Menutup browser setelah selesai
    await browser.close();

    // Mengirimkan file PDF sebagai respons HTTP dengan header yang menginstruksikan browser untuk mengunduhnya
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/generateExcel", async (req, res) => {
  try {
    const results = await new Promise((resolve, reject) => {
      connection.query(sqlQuery, (error, results, fields) => {
        if (error) reject(error);
        resolve(results);
      });
    });

    // Menghitung total jumlah dan total nilai dari data aset
    let totalJumlah = 0;
    let totalNilai = 0;
    results.forEach((aset) => {
      totalJumlah += aset.jumlah;
      totalNilai += aset.nilai;
    });

    // Membuat workbook dan worksheet ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Aset Data");

    // Menambahkan header ke worksheet dengan gaya yang ditingkatkan
    const headerRow = worksheet.addRow([
      "ID Aset",
      "Nama Aset",
      "Jumlah",
      "Nilai",
      "Lokasi",
    ]);
    headerRow.font = { bold: true }; // Membuat teks header menjadi tebal
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "DDDDDD" }, // Warna latar belakang header
    };
    worksheet.getColumn(1).width = 30; // Mengatur lebar kolom ID Aset
    worksheet.getColumn(2).width = 30; // Mengatur lebar kolom Nama Aset
    worksheet.getColumn(3).width = 30; // Mengatur lebar kolom Jumlah
    worksheet.getColumn(4).width = 30; // Mengatur lebar kolom Nilai
    worksheet.getColumn(5).width = 30; // Mengatur lebar kolom Lokasi

    // Menambahkan data ke worksheet dengan gaya yang ditingkatkan
    results.forEach((aset) => {
      const row = worksheet.addRow([
        aset.id_aset,
        aset.nama_aset,
        aset.jumlah,
        aset.nilai,
        aset.nama_lokasi,
      ]);

      // Mengatur rata tengah untuk kolom ID Aset, Nama Aset, Jumlah, Nilai, dan Lokasi
      row.alignment = { horizontal: "left" };
    });

    // Menambahkan total jumlah dan total nilai ke worksheet dengan gaya yang ditingkatkan
    const totalJumlahRow = worksheet.addRow([
      "Total Jumlah Aset :",
      totalJumlah.toString(),
      "",
      "",
    ]);
    totalJumlahRow.font = { bold: true };
    totalJumlahRow.alignment = { horizontal: "left" }; // Mengatur rata tengah untuk sel total jumlah

    const totalNilaiRow = worksheet.addRow([
      "Total Nilai :",
      `Rp ${totalNilai.toString()}`,
      "",
      "",
    ]);
    totalNilaiRow.font = { bold: true };
    totalNilaiRow.alignment = { horizontal: "left" }; // Mengatur rata tengah untuk sel total nilai

    // Menghasilkan file Excel dan mengirimkannya sebagai respons HTTP
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=aset_data.xlsx");

    await workbook.xlsx.write(res);
    res.end();
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
