-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 02, 2023 at 02:52 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `aset`
--

-- --------------------------------------------------------

--
-- Table structure for table `aset`
--

CREATE TABLE `aset` (
  `id` int(11) NOT NULL,
  `id_aset` varchar(255) NOT NULL,
  `nilai` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL,
  `id_lokasi` int(11) NOT NULL,
  `id_sumber` int(11) NOT NULL,
  `kondisi` varchar(255) NOT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `aset`
--

INSERT INTO `aset` (`id`, `id_aset`, `nilai`, `jumlah`, `id_lokasi`, `id_sumber`, `kondisi`, `created_at`) VALUES
(60, '5.1.1', 50000, 1, 23, 18, 'Baik', '2023-11-27'),
(61, '2.1.1', 10000, 2, 23, 18, 'Baik', '2023-11-27'),
(62, '4.2.1', 200000000, 1, 25, 16, 'Baik', '2023-11-27'),
(63, '4.1.1', 15000000, 1, 25, 16, 'Baik', '2023-11-27');

-- --------------------------------------------------------

--
-- Table structure for table `jenis`
--

CREATE TABLE `jenis` (
  `id_jenis` varchar(11) NOT NULL,
  `id_kategori` int(11) DEFAULT NULL,
  `nama_jenis` varchar(255) DEFAULT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jenis`
--

INSERT INTO `jenis` (`id_jenis`, `id_kategori`, `nama_jenis`, `created_at`) VALUES
('1.1', 1, 'Tanah untuk Bangunan Gedung', '2023-11-04'),
('1.2', 1, 'Tanah untuk Bangunan Bukan Gedung', '2023-11-12'),
('2.1', 2, 'Alat Kantor', '2023-11-04'),
('2.2', 2, 'Alat Rumah Tangga', '2023-11-12'),
('2.3', 2, 'Komputer', '2023-11-12'),
('2.4', 2, 'Meja dan Kursi Kerja/Rapat Pejabat', '2023-11-12'),
('2.5', 2, 'Alat Studio', '2023-11-12'),
('2.6', 2, 'Alat Komunikasi', '2023-11-12'),
('3.1', 3, 'Bangunan Gedung Tempat Kerja', '2023-11-12'),
('3.2', 3, 'Bangunan Gedung Tempat Tinggal', '2023-11-12'),
('4.1', 4, 'Motor', '2023-11-12'),
('4.2', 4, 'Mobil', '2023-11-12'),
('5.1', 5, 'Buku', '2023-11-27');

-- --------------------------------------------------------

--
-- Table structure for table `kategori`
--

CREATE TABLE `kategori` (
  `id_kategori` int(11) NOT NULL,
  `nama_kategori` varchar(255) NOT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kategori`
--

INSERT INTO `kategori` (`id_kategori`, `nama_kategori`, `created_at`) VALUES
(1, 'Tanah', '2023-11-04'),
(2, 'Peralatan dan Mesin', '2023-11-04'),
(3, 'Gedung dan Bangunan', '2023-11-12'),
(4, 'Kendaraan', '2023-11-12'),
(5, 'Gabungan Aset Tetap Lainnya', '2023-11-27');

-- --------------------------------------------------------

--
-- Table structure for table `lokasi`
--

CREATE TABLE `lokasi` (
  `nama_lokasi` varchar(255) NOT NULL,
  `id` int(11) NOT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lokasi`
--

INSERT INTO `lokasi` (`nama_lokasi`, `id`, `created_at`) VALUES
('Ruang Kelas', 23, '2023-11-25'),
('Ruang Kantor', 24, '2023-11-26'),
('Lapangan', 25, '2023-11-27');

-- --------------------------------------------------------

--
-- Table structure for table `nama_aset`
--

CREATE TABLE `nama_aset` (
  `id_aset` varchar(11) NOT NULL,
  `id_kategori` int(11) DEFAULT NULL,
  `id_jenis` varchar(11) NOT NULL,
  `nama_aset` varchar(255) DEFAULT NULL,
  `images` varchar(255) NOT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `nama_aset`
--

INSERT INTO `nama_aset` (`id_aset`, `id_kategori`, `id_jenis`, `nama_aset`, `images`, `created_at`) VALUES
('2.1.1', 2, '2.1', 'Pulpen', '/uploads/pulpen.jpg', '2023-11-25'),
('2.3.1', 2, '2.3', 'Laptop', '/uploads/laptop.jpg', '2023-11-25'),
('4.1.1', 4, '4.1', 'Beat', '/uploads/beat.jpg', '2023-11-26'),
('4.2.1', 4, '4.2', 'Avanza', '/uploads/download.jpg', '2023-11-27'),
('5.1.1', 5, '5.1', 'Buku Pemrograman Dasar', '/uploads/buku.jpg', '2023-11-27');

-- --------------------------------------------------------

--
-- Table structure for table `sumber`
--

CREATE TABLE `sumber` (
  `nama_sumber` varchar(255) NOT NULL,
  `id` int(11) NOT NULL,
  `created_at` date NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sumber`
--

INSERT INTO `sumber` (`nama_sumber`, `id`, `created_at`) VALUES
('Yayasan', 16, '2023-11-25'),
('Unit', 18, '2023-11-27');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  `role` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` date NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `created_at`) VALUES
(0, 'admin', 'admin', 'admin', 1, '2023-11-02'),
(2, 'Dwi Bagia Santosa', '1207050030', 'test123', 0, '2023-11-02'),
(3, 'Fatih Fauzan', '1207050037', 'test123', 0, '2023-11-02'),
(4, 'Jessy Fauziah', '1207050137', 'test123', 0, '2023-11-02'),
(5, 'Frinadi Syauqi', '1207050041', 'test123', 0, '2023-11-02'),
(6, 'Dani Ali Kinan', '1207050139', 'test123', 0, '2023-11-02'),
(10, 'Jeje', '1207050', 'test123', 1, '2023-11-02'),
(11, 'Jessy', '1207050137', 'sone123', 0, '2023-11-02'),
(12, 'Jessy Faujiyyah', 'Jessy Faujiyyah Khairani', 'dududu123', 0, '2023-11-04'),
(13, 'Jessy Faujiyyah', 'jessy', '123jessy', 0, '2023-11-12'),
(14, 'user', 'user', 'user', 0, '2023-11-27');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `aset`
--
ALTER TABLE `aset`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `jenis`
--
ALTER TABLE `jenis`
  ADD PRIMARY KEY (`id_jenis`),
  ADD KEY `id_kategori` (`id_kategori`);

--
-- Indexes for table `kategori`
--
ALTER TABLE `kategori`
  ADD PRIMARY KEY (`id_kategori`);

--
-- Indexes for table `lokasi`
--
ALTER TABLE `lokasi`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `nama_aset`
--
ALTER TABLE `nama_aset`
  ADD PRIMARY KEY (`id_aset`),
  ADD KEY `jenis_id` (`id_jenis`);

--
-- Indexes for table `sumber`
--
ALTER TABLE `sumber`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `aset`
--
ALTER TABLE `aset`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `kategori`
--
ALTER TABLE `kategori`
  MODIFY `id_kategori` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1006;

--
-- AUTO_INCREMENT for table `lokasi`
--
ALTER TABLE `lokasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `sumber`
--
ALTER TABLE `sumber`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `jenis`
--
ALTER TABLE `jenis`
  ADD CONSTRAINT `jenis_ibfk_1` FOREIGN KEY (`id_kategori`) REFERENCES `kategori` (`id_kategori`);

--
-- Constraints for table `nama_aset`
--
ALTER TABLE `nama_aset`
  ADD CONSTRAINT `jenis_id` FOREIGN KEY (`id_jenis`) REFERENCES `jenis` (`id_jenis`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
