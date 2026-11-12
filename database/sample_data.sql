USE payroll_db;
INSERT INTO departments(dept_name) VALUES ('Human Resources'),('Finance'),('Engineering'),('Sales'),('Operations');
INSERT INTO employees(emp_name,dept_id,designation,basic_salary,join_date) VALUES
('Aarav Kumar',3,'Software Engineer',52000,'2023-06-12'),('Divya Raman',3,'Senior Developer',78000,'2021-02-01'),
('Meena Lakshmi',1,'HR Executive',38000,'2022-09-19'),('Suresh Babu',2,'Accountant',42000,'2022-01-10'),
('Priya Nair',4,'Sales Manager',65000,'2020-11-03'),('Karthik Raj',4,'Sales Executive',32000,'2024-03-18'),
('Anitha Devi',5,'Operations Lead',58000,'2021-07-26'),('Vikram Singh',5,'Technician',28000,'2024-08-05'),
('Harini Sekar',2,'Finance Analyst',46000,'2023-01-16'),('Rohit Menon',3,'QA Engineer',44000,'2023-10-02');
INSERT INTO users(username,password,role,emp_id) VALUES ('admin','admin123','ADMIN',NULL);
INSERT INTO users(username,password,role,emp_id) SELECT CAST(emp_id AS CHAR),'emp123','EMPLOYEE',emp_id FROM employees;
INSERT INTO attendance(emp_id,att_date,status,working_hours)
WITH RECURSIVE d(dt) AS (SELECT DATE('2026-08-03') UNION ALL SELECT dt+INTERVAL 1 DAY FROM d WHERE dt<'2026-11-12')
SELECT emp_id,dt,
 CASE WHEN r<82 THEN 'Present' WHEN r<90 THEN 'Absent' WHEN r<95 THEN 'Half Day' ELSE 'On Leave' END,
 CASE WHEN r<82 THEN 8 WHEN r>=90 AND r<95 THEN 4 ELSE 0 END
FROM (SELECT e.emp_id,d.dt,MOD(CRC32(CONCAT(e.emp_id,d.dt)),100) r FROM d CROSS JOIN employees e
      WHERE DAYOFWEEK(d.dt) BETWEEN 2 AND 6) x;
INSERT INTO leave_records(emp_id,leave_type,start_date,end_date,total_days,reason,status) VALUES
(101,'Casual','2026-09-14','2026-09-15',2,'Family function','Approved'),(103,'Sick','2026-10-05','2026-10-07',3,'Fever','Approved'),
(105,'Earned','2026-10-19','2026-10-23',5,'Vacation','Approved'),(108,'Loss of Pay','2026-11-02','2026-11-03',2,'Personal','Approved');
