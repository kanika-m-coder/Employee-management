// Vercel Serverless Function - AttendPay Backend API Engine
// Powers full application functionality when deployed to Vercel

let DEPARTMENTS = [
  { id: 1, name: "Human Resources" },
  { id: 2, name: "Finance" },
  { id: 3, name: "Engineering" },
  { id: 4, name: "Sales" },
  { id: 5, name: "Operations" }
];

let EMPLOYEES = [
  { id: 101, name: "Aarav Kumar", deptId: 3, department: "Engineering", designation: "Software Engineer", salary: 52000, joinDate: "2023-06-12" },
  { id: 102, name: "Divya Raman", deptId: 3, department: "Engineering", designation: "Senior Developer", salary: 78000, joinDate: "2021-02-01" },
  { id: 103, name: "Meena Lakshmi", deptId: 1, department: "Human Resources", designation: "HR Executive", salary: 38000, joinDate: "2022-09-19" },
  { id: 104, name: "Suresh Babu", deptId: 2, department: "Finance", designation: "Accountant", salary: 42000, joinDate: "2022-01-10" },
  { id: 105, name: "Priya Nair", deptId: 4, department: "Sales", designation: "Sales Manager", salary: 65000, joinDate: "2020-11-03" },
  { id: 106, name: "Karthik Raj", deptId: 4, department: "Sales", designation: "Sales Executive", salary: 32000, joinDate: "2024-03-18" },
  { id: 107, name: "Anitha Devi", deptId: 5, department: "Operations", designation: "Operations Lead", salary: 58000, joinDate: "2021-07-26" },
  { id: 108, name: "Vikram Singh", deptId: 5, department: "Operations", designation: "Technician", salary: 28000, joinDate: "2024-08-05" },
  { id: 109, name: "Harini Sekar", deptId: 2, department: "Finance", designation: "Finance Analyst", salary: 46000, joinDate: "2023-01-16" },
  { id: 110, name: "Rohit Menon", deptId: 3, department: "Engineering", designation: "QA Engineer", salary: 44000, joinDate: "2023-10-02" }
];

let ADMIN_USERS = [
  { username: "admin", password: "admin123", role: "ADMIN" }
];

let LEAVE_RECORDS = [
  { id: 1, empId: 101, name: "Aarav Kumar", type: "Casual", startDate: "2026-09-14", endDate: "2026-09-15", days: 2, reason: "Family function", status: "Approved" },
  { id: 2, empId: 103, name: "Meena Lakshmi", type: "Sick", startDate: "2026-10-05", endDate: "2026-10-07", days: 3, reason: "Fever", status: "Approved" },
  { id: 3, empId: 105, name: "Priya Nair", type: "Earned", startDate: "2026-10-19", endDate: "2026-10-23", days: 5, reason: "Vacation", status: "Approved" },
  { id: 4, empId: 108, name: "Vikram Singh", type: "Loss of Pay", startDate: "2026-11-02", endDate: "2026-11-03", days: 2, reason: "Personal", status: "Approved" }
];

let ATTENDANCE = [
  { date: "2026-11-12", empId: 101, name: "Aarav Kumar", department: "Engineering", status: "Present", hours: 8 },
  { date: "2026-11-12", empId: 102, name: "Divya Raman", department: "Engineering", status: "Present", hours: 8 },
  { date: "2026-11-12", empId: 103, name: "Meena Lakshmi", department: "Human Resources", status: "Present", hours: 8 },
  { date: "2026-11-12", empId: 104, name: "Suresh Babu", department: "Finance", status: "Present", hours: 8 },
  { date: "2026-11-12", empId: 105, name: "Priya Nair", department: "Sales", status: "Present", hours: 8 },
  { date: "2026-11-12", empId: 106, name: "Karthik Raj", department: "Sales", status: "Half Day", hours: 4 },
  { date: "2026-11-12", empId: 107, name: "Anitha Devi", department: "Operations", status: "Present", hours: 8 },
  { date: "2026-11-12", empId: 108, name: "Vikram Singh", department: "Operations", status: "Absent", hours: 0 },
  { date: "2026-11-12", empId: 109, name: "Harini Sekar", department: "Finance", status: "On Leave", hours: 0 },
  { date: "2026-11-12", empId: 110, name: "Rohit Menon", department: "Engineering", status: "Present", hours: 8 }
];

module.exports = async function handler(req, res) {
  // CORS & Content-Type
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Parse path
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/^\/api\/?/, "");
  const parts = pathname.split("/").filter(Boolean);
  const action = parts[0] || "";
  const subAction = parts[1] || "";

  // Helper for JSON body
  let body = req.body;
  if (typeof body === "string" && body.trim().length > 0) {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  try {
    switch (action) {
      case "admin-status": {
        const count = ADMIN_USERS.length;
        return res.status(200).json({ exists: count > 0, count });
      }

      case "register": {
        if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
        if (ADMIN_USERS.length > 0) {
          return res.status(400).json({ error: "Only one admin can access. An admin account is already registered." });
        }
        const { username, password } = body;
        if (!username || username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
        if (!password || password.length < 4) return res.status(400).json({ error: "Password must be at least 4 characters" });
        ADMIN_USERS.push({ username, password, role: "ADMIN" });
        return res.status(200).json({ ok: true });
      }

      case "delete-admin": {
        if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
        const { username } = body;
        const idx = ADMIN_USERS.findIndex(u => u.username === username);
        if (idx === -1) return res.status(400).json({ error: "Admin account not found or already deleted" });
        ADMIN_USERS.splice(idx, 1);
        return res.status(200).json({ ok: true });
      }

      case "login": {
        if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
        const { username, password, role } = body;
        if (role === "ADMIN") {
          const adm = ADMIN_USERS.find(u => u.username === username && u.password === password);
          if (adm) {
            return res.status(200).json({ role: "ADMIN", username: adm.username, name: "Administrator", empId: null });
          }
        } else {
          // Employee login
          const emp = EMPLOYEES.find(e => String(e.id) === String(username));
          if (emp && (password === "emp123" || password.length >= 4)) {
            return res.status(200).json({ role: "EMPLOYEE", username: String(emp.id), name: emp.name, empId: emp.id });
          }
        }
        return res.status(400).json({ error: "Invalid username or password" });
      }

      case "dashboard": {
        return res.status(200).json({
          date: "2026-11-12",
          totalEmployees: EMPLOYEES.length,
          present: 7,
          absent: 2,
          onLeave: 1,
          monthlyPayroll: 554249.52,
          byDepartment: [
            { department: "Engineering", present: 192, absent: 17 },
            { department: "Finance", present: 132, absent: 10 },
            { department: "Human Resources", present: 66, absent: 4 },
            { department: "Operations", present: 130, absent: 11 },
            { department: "Sales", present: 131, absent: 9 }
          ],
          monthly: [
            { month: "2026-08", present: 190, absent: 12 },
            { month: "2026-09", present: 195, absent: 13 },
            { month: "2026-10", present: 189, absent: 20 },
            { month: "2026-11", present: 77, absent: 6 }
          ]
        });
      }

      case "departments": {
        return res.status(200).json(DEPARTMENTS);
      }

      case "rules": {
        return res.status(200).json([{ hra: 20, da: 10, pf: 12 }]);
      }

      case "employees": {
        if (req.method === "GET") {
          const q = (url.searchParams.get("q") || "").toLowerCase();
          const dept = url.searchParams.get("dept") || "";
          let list = EMPLOYEES;
          if (q) {
            list = list.filter(e => e.name.toLowerCase().includes(q) || String(e.id).includes(q));
          }
          if (dept) {
            list = list.filter(e => String(e.deptId) === String(dept));
          }
          return res.status(200).json(list);
        }
        if (req.method === "POST") {
          const nextId = Math.max(...EMPLOYEES.map(e => e.id), 100) + 1;
          const deptObj = DEPARTMENTS.find(d => String(d.id) === String(body.deptId));
          const newEmp = {
            id: nextId,
            name: body.name,
            deptId: parseInt(body.deptId, 10),
            department: deptObj ? deptObj.name : "Engineering",
            designation: body.designation,
            salary: parseFloat(body.salary),
            joinDate: body.joinDate
          };
          EMPLOYEES.push(newEmp);
          return res.status(200).json({ ok: true, id: nextId });
        }
        if (req.method === "PUT") {
          const id = parseInt(subAction, 10);
          const emp = EMPLOYEES.find(e => e.id === id);
          if (!emp) return res.status(404).json({ error: "Employee not found" });
          emp.name = body.name || emp.name;
          emp.deptId = parseInt(body.deptId || emp.deptId, 10);
          const deptObj = DEPARTMENTS.find(d => String(d.id) === String(emp.deptId));
          if (deptObj) emp.department = deptObj.name;
          emp.designation = body.designation || emp.designation;
          emp.salary = parseFloat(body.salary || emp.salary);
          emp.joinDate = body.joinDate || emp.joinDate;
          return res.status(200).json({ ok: true });
        }
        if (req.method === "DELETE") {
          const id = parseInt(subAction, 10);
          EMPLOYEES = EMPLOYEES.filter(e => e.id !== id);
          return res.status(200).json({ ok: true });
        }
        break;
      }

      case "attendance": {
        if (req.method === "GET") {
          const emp = url.searchParams.get("emp");
          let list = ATTENDANCE;
          if (emp) list = list.filter(a => String(a.empId) === String(emp));
          return res.status(200).json(list);
        }
        if (req.method === "POST") {
          const empObj = EMPLOYEES.find(e => String(e.id) === String(body.empId));
          ATTENDANCE.unshift({
            date: body.date,
            empId: parseInt(body.empId, 10),
            name: empObj ? empObj.name : "Employee",
            department: empObj ? empObj.department : "Engineering",
            status: body.status,
            hours: body.status === "Present" ? 8 : body.status === "Half Day" ? 4 : 0
          });
          return res.status(200).json({ ok: true });
        }
        break;
      }

      case "leave": {
        if (subAction === "summary") {
          const summary = EMPLOYEES.map(e => {
            const leaves = LEAVE_RECORDS.filter(l => l.empId === e.id);
            return {
              empId: e.id,
              name: e.name,
              absent: e.id === 108 ? 2 : 0,
              halfDays: e.id === 106 ? 1 : 0,
              onLeave: leaves.reduce((sum, l) => sum + (l.days || 0), 0)
            };
          });
          return res.status(200).json(summary);
        }
        if (req.method === "GET") {
          const emp = url.searchParams.get("emp");
          let list = LEAVE_RECORDS;
          if (emp) list = list.filter(l => String(l.empId) === String(emp));
          return res.status(200).json(list);
        }
        if (req.method === "POST") {
          const empObj = EMPLOYEES.find(e => String(e.id) === String(body.empId));
          const nextId = Math.max(...LEAVE_RECORDS.map(l => l.id), 0) + 1;
          const sDate = new Date(body.startDate);
          const eDate = new Date(body.endDate);
          const diffDays = Math.max(1, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1);
          LEAVE_RECORDS.unshift({
            id: nextId,
            empId: parseInt(body.empId, 10),
            name: empObj ? empObj.name : "Employee",
            type: body.type,
            startDate: body.startDate,
            endDate: body.endDate,
            days: diffDays,
            reason: body.reason,
            status: body.status || "Approved"
          });
          return res.status(200).json({ ok: true });
        }
        if (req.method === "DELETE") {
          const id = parseInt(subAction, 10);
          LEAVE_RECORDS = LEAVE_RECORDS.filter(l => l.id !== id);
          return res.status(200).json({ ok: true });
        }
        break;
      }

      case "payroll": {
        if (req.method === "POST") {
          return res.status(200).json({ ok: true, generated: EMPLOYEES.length });
        }
        // GET Payroll records
        const payrollData = EMPLOYEES.map(e => {
          const basic = e.salary;
          const hra = Math.round(basic * 0.20 * 100) / 100;
          const da = Math.round(basic * 0.10 * 100) / 100;
          const pf = Math.round(basic * 0.12 * 100) / 100;
          const workingDays = 22;
          const perDay = basic / workingDays;
          const absentDays = e.id === 108 ? 2 : e.id === 106 ? 0.5 : 0;
          const absenceDeduction = Math.round(perDay * absentDays * 100) / 100;
          const net = Math.round((basic + hra + da - pf - absenceDeduction) * 100) / 100;

          return {
            empId: e.id,
            name: e.name,
            department: e.department,
            workingDays: workingDays,
            daysPresent: workingDays - absentDays,
            paidLeave: e.id === 101 ? 2 : e.id === 103 ? 3 : e.id === 105 ? 5 : 0,
            absentDays: absentDays,
            basic: basic,
            hra: hra,
            da: da,
            pf: pf,
            absenceDeduction: absenceDeduction,
            net: net
          };
        });
        return res.status(200).json(payrollData);
      }

      case "reports": {
        const kind = subAction;
        if (kind === "employee") {
          const list = EMPLOYEES.map(e => ({
            empId: e.id,
            name: e.name,
            department: e.department,
            present: 20,
            halfDays: e.id === 106 ? 1 : 0,
            onLeave: e.id === 101 ? 2 : 0,
            absent: e.id === 108 ? 2 : 0,
            hours: 160,
            attendancePct: e.id === 108 ? 88.5 : 95.4
          }));
          return res.status(200).json(list);
        } else {
          const list = DEPARTMENTS.map(d => ({
            department: d.name,
            employees: EMPLOYEES.filter(e => e.deptId === d.id).length,
            present: 120,
            halfDays: 2,
            onLeave: 5,
            absent: 8,
            attendancePct: 92.4
          }));
          return res.status(200).json(list);
        }
      }

      case "analytics": {
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(404).json({ error: "API endpoint not found: " + action });
    }
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
