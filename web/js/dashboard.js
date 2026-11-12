// AttendPay - Modern SaaS Dashboard Visualizations
(async () => {
  try {
    const d = await api("/dashboard");
    
    // Set Dashboard Page Title with live date
    const titleEl = document.getElementById("title");
    if (titleEl) {
      titleEl.innerHTML = `Workforce & Payroll Intelligence <span style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-left:8px">(as of ${d.date})</span>`;
    }

    // Update Statistic Card Metrics
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set("total", d.totalEmployees || 0);
    set("present", d.present || 0);
    set("absent", d.absent || 0);
    set("leave", d.onLeave || 0);
    set("payroll", "₹" + Number(d.monthlyPayroll || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    // Calculate percentage rates
    if (d.totalEmployees > 0) {
      const presRate = Math.round(((d.present || 0) / d.totalEmployees) * 100);
      const absRate = Math.round(((d.absent || 0) / d.totalEmployees) * 100);
      const presPctEl = document.getElementById("presPct");
      const absPctEl = document.getElementById("absPct");
      if (presPctEl) presPctEl.innerHTML = `<span>● ${presRate}% attendance rate today</span>`;
      if (absPctEl) absPctEl.innerHTML = `<span>● ${absRate}% absence rate today</span>`;
    }

    // Chart Global Defaults
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = "#718096";

    const commonScales = {
      y: {
        beginAtZero: true,
        grid: { color: "#F1F5F9", drawBorder: false },
        ticks: { padding: 8 }
      },
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { padding: 8 }
      }
    };

    const commonPlugins = {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,
          font: { weight: "600", size: 12 }
        }
      },
      tooltip: {
        backgroundColor: "#101827",
        titleFont: { weight: "700", size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      }
    };

    // 1. Chart: Monthly Attendance Trends (Line Chart)
    const monthCanvas = document.getElementById("month");
    if (monthCanvas) {
      const ctx = monthCanvas.getContext("2d");
      const gradCyan = ctx.createLinearGradient(0, 0, 0, 260);
      gradCyan.addColorStop(0, "rgba(22, 199, 217, 0.22)");
      gradCyan.addColorStop(1, "rgba(22, 199, 217, 0.0)");

      new Chart(monthCanvas, {
        type: "line",
        data: {
          labels: d.monthly.map(x => x.month),
          datasets: [
            {
              label: "Present",
              data: d.monthly.map(x => x.present),
              borderColor: "#16C7D9",
              backgroundColor: gradCyan,
              borderWidth: 2.5,
              tension: 0.35,
              fill: true,
              pointBackgroundColor: "#FFFFFF",
              pointBorderColor: "#16C7D9",
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: "Absent",
              data: d.monthly.map(x => x.absent),
              borderColor: "#E05252",
              backgroundColor: "transparent",
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.35,
              fill: false,
              pointBackgroundColor: "#FFFFFF",
              pointBorderColor: "#E05252",
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          plugins: commonPlugins,
          scales: commonScales
        }
      });
    }

    // 2. Chart: Department-wise Attendance (Grouped Bar Chart)
    const deptCanvas = document.getElementById("dept");
    if (deptCanvas) {
      new Chart(deptCanvas, {
        type: "bar",
        data: {
          labels: d.byDepartment.map(x => x.department),
          datasets: [
            {
              label: "Present",
              data: d.byDepartment.map(x => x.present),
              backgroundColor: "#16C7D9",
              borderRadius: 6,
              borderSkipped: false
            },
            {
              label: "Absent",
              data: d.byDepartment.map(x => x.absent),
              backgroundColor: "#263B63",
              borderRadius: 6,
              borderSkipped: false
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          plugins: commonPlugins,
          scales: commonScales
        }
      });
    }

    // 3. Chart: Attendance Status Distribution (Donut Chart)
    const distCanvas = document.getElementById("dist");
    if (distCanvas) {
      new Chart(distCanvas, {
        type: "doughnut",
        data: {
          labels: ["Present", "Absent", "On Leave"],
          datasets: [
            {
              data: [d.present || 0, d.absent || 0, d.onLeave || 0],
              backgroundColor: ["#16A36A", "#E05252", "#16C7D9"],
              borderWidth: 3,
              borderColor: "#FFFFFF",
              hoverOffset: 4
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          cutout: "70%",
          plugins: {
            ...commonPlugins,
            legend: {
              position: "bottom",
              labels: {
                usePointStyle: true,
                padding: 16,
                font: { weight: "600", size: 12 }
              }
            }
          }
        }
      });
    }

    // 4. Chart: Department Attendance Volume Comparison
    const shareCanvas = document.getElementById("deptShare");
    if (shareCanvas) {
      new Chart(shareCanvas, {
        type: "bar",
        data: {
          labels: d.byDepartment.map(x => x.department),
          datasets: [
            {
              label: "Total Attendance Recorded",
              data: d.byDepartment.map(x => (x.present || 0) + (x.absent || 0)),
              backgroundColor: "#263B63",
              borderRadius: 6,
              borderSkipped: false
            }
          ]
        },
        options: {
          indexAxis: "y",
          maintainAspectRatio: false,
          responsive: true,
          plugins: commonPlugins,
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: "#F1F5F9" },
              ticks: { padding: 6 }
            },
            y: {
              grid: { display: false },
              ticks: { padding: 6 }
            }
          }
        }
      });
    }

    // 5. Populate Department Table Summary
    const deptTableEl = document.getElementById("deptTable");
    if (deptTableEl && d.byDepartment) {
      const rows = d.byDepartment.map(dp => {
        const total = (dp.present || 0) + (dp.absent || 0);
        const rate = total > 0 ? Math.round((dp.present / total) * 100) : 0;
        return {
          dept: dp.department,
          present: dp.present,
          absent: dp.absent,
          total: total,
          rate: rate + "%"
        };
      });

      table("deptTable", [
        ["Department", "dept"],
        ["Present Days", "present"],
        ["Absent Days", "absent"],
        ["Total Recorded", "total"],
        ["Attendance Rate", r => `<span class="badge ${parseInt(r.rate) >= 90 ? 'Approved' : parseInt(r.rate) >= 80 ? 'Pending' : 'Rejected'}">${r.rate}</span>`]
      ], rows);
    }

  } catch (e) {
    showError(e.message === "Failed to fetch" 
      ? "Cannot connect to AttendPay backend. Ensure the server is active on port 8080." 
      : e.message
    );
  }
})();
