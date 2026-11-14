CREATE DATABASE IF NOT EXISTS employee_payroll;
USE employee_payroll;

CREATE TABLE IF NOT EXISTS employees (
 employee_id INT AUTO_INCREMENT PRIMARY KEY,
 employee_code VARCHAR(20) NOT NULL UNIQUE,
 full_name VARCHAR(100) NOT NULL,
 department VARCHAR(60) NOT NULL,
 designation VARCHAR(60) NOT NULL,
 email VARCHAR(120),
 phone VARCHAR(20),
 password_hash VARCHAR(255),
 basic_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
 date_joined DATE NOT NULL,
 employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_accounts (
 admin_id TINYINT NOT NULL PRIMARY KEY,
 full_name VARCHAR(100) NOT NULL,
 email VARCHAR(120) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
 attendance_id INT AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NOT NULL,
 attendance_date DATE NOT NULL,
 check_in TIME NULL,
 check_out TIME NULL,
 attendance_status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
 remarks VARCHAR(255),
 FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
 UNIQUE KEY uq_employee_day (employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
 leave_id INT AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NOT NULL,
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 leave_type VARCHAR(40) NOT NULL,
 reason VARCHAR(255),
 leave_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll (
 payroll_id INT AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NOT NULL,
 pay_month CHAR(7) NOT NULL,
 basic_salary DECIMAL(10,2) NOT NULL,
 allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
 deduction DECIMAL(10,2) NOT NULL DEFAULT 0,
 net_salary DECIMAL(10,2) NOT NULL,
 generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
 UNIQUE KEY uq_employee_month (employee_id, pay_month)
);

INSERT IGNORE INTO employees
(employee_code,full_name,department,designation,email,phone,basic_salary,date_joined)
VALUES
('EMP001','Arun Kumar','Administration','Office Assistant','arun@example.com','9000000001',22000,'2024-06-10'),
('EMP002','Meena Raj','Accounts','Accountant','meena@example.com','9000000002',28000,'2023-11-02'),
('EMP003','Karthik S','IT','Junior Developer','karthik@example.com','9000000003',32000,'2025-01-15');
