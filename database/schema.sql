-- Re-runnable: recreates the database from scratch
DROP DATABASE IF EXISTS payroll_db;
CREATE DATABASE payroll_db;
USE payroll_db;
CREATE TABLE departments (dept_id INT AUTO_INCREMENT PRIMARY KEY, dept_name VARCHAR(50) NOT NULL UNIQUE);
CREATE TABLE employees (
  emp_id INT AUTO_INCREMENT PRIMARY KEY, emp_name VARCHAR(100) NOT NULL, dept_id INT NOT NULL,
  designation VARCHAR(80) NOT NULL, basic_salary DECIMAL(10,2) NOT NULL CHECK (basic_salary > 0),
  join_date DATE NOT NULL, FOREIGN KEY (dept_id) REFERENCES departments(dept_id)) AUTO_INCREMENT=101;
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password VARCHAR(100) NOT NULL,
  role ENUM('ADMIN','EMPLOYEE') NOT NULL, emp_id INT NULL,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE);
CREATE TABLE attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY, emp_id INT NOT NULL, att_date DATE NOT NULL,
  status ENUM('Present','Absent','Half Day','On Leave') NOT NULL, working_hours DECIMAL(4,2) DEFAULT 0,
  UNIQUE (emp_id, att_date), FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE);
CREATE TABLE leave_records (
  leave_id INT AUTO_INCREMENT PRIMARY KEY, emp_id INT NOT NULL,
  leave_type ENUM('Casual','Sick','Earned','Loss of Pay') NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
  total_days INT NOT NULL, reason VARCHAR(255), status ENUM('Pending','Approved','Rejected') DEFAULT 'Approved',
  CHECK (end_date >= start_date), FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE);
CREATE TABLE salary_rules (rule_id INT PRIMARY KEY, hra_percent DECIMAL(5,2), da_percent DECIMAL(5,2), pf_percent DECIMAL(5,2));
INSERT INTO salary_rules VALUES (1,20,10,12);
CREATE TABLE payroll (
  payroll_id INT AUTO_INCREMENT PRIMARY KEY, emp_id INT NOT NULL, pay_month TINYINT NOT NULL, pay_year SMALLINT NOT NULL,
  working_days INT NOT NULL, days_present DECIMAL(4,1) NOT NULL, paid_leave_days DECIMAL(4,1) NOT NULL DEFAULT 0,
  absent_days DECIMAL(4,1) NOT NULL, basic DECIMAL(10,2) NOT NULL, hra DECIMAL(10,2) NOT NULL, da DECIMAL(10,2) NOT NULL,
  pf_deduction DECIMAL(10,2) NOT NULL, absence_deduction DECIMAL(10,2) NOT NULL, net_salary DECIMAL(10,2) NOT NULL,
  generated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE (emp_id, pay_month, pay_year),
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id) ON DELETE CASCADE);
CREATE INDEX idx_att_date ON attendance(att_date);
