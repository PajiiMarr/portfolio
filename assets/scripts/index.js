const username = "PajiiMarr";

const today = new Date();
const lastYear = new Date();
lastYear.setFullYear(today.getFullYear() - 1);

// Exact boundary dates as YYYY-MM-DD strings for reliable string comparison
const from = lastYear.toISOString().split("T")[0];
const to   = today.toISOString().split("T")[0];

const fromLabel = lastYear.toLocaleString("en-US", { month: "short", year: "numeric" });
const toLabel   = today.toLocaleString("en-US",    { month: "short", year: "numeric" });

document.title = `GitHub Contributions ${fromLabel} – ${toLabel}`;

fetch(`http://localhost:8080/api/github-contributions?username=${username}&from=${from}&to=${to}`)
  .then(res => res.json())
  .then(data => {

    const calendarEl = document.getElementById("calendar");
    const allWeeks   = data.data.user.contributionsCollection.contributionCalendar.weeks;

    // ── 1. Flatten ALL days from the API response ─────────────────────────
    const allDays = [];
    allWeeks.forEach(w => w.contributionDays.forEach(d => allDays.push(d)));

    // ── 2. Keep only days within [from, to] (YYYY-MM-DD string compare) ──
    const days = allDays.filter(d => d.date >= from && d.date <= to);

    // ── 3. Re-bucket into Sun-based weeks, padding the first partial week ─
    const buckets = [];
    let week = [];

    days.forEach((day, i) => {
      if (i === 0) {
        // pad with nulls so day lands on correct column (0=Sun … 6=Sat)
        const dow = new Date(day.date + "T12:00:00").getDay();
        for (let p = 0; p < dow; p++) week.push(null);
      }

      week.push(day);

      if (week.length === 7) {
        buckets.push(week);
        week = [];
      }
    });
    if (week.length) buckets.push(week); // trailing partial week

    // ── 4. Colour helper ──────────────────────────────────────────────────
    function getColor(count) {
      if (count === 0) return "#3a3a3a";
      if (count < 3)   return "#0e4429";
      if (count < 6)   return "#006d32";
      if (count < 9)   return "#26a641";
      return "#39d353";
    }

    // ── 5. Total ──────────────────────────────────────────────────────────
    const total = days.reduce((s, d) => s + d.contributionCount, 0);

    const totalEl = document.createElement("h2");
    totalEl.textContent = `${total} contributions  ·  ${fromLabel} – ${toLabel}`;
    totalEl.style.color        = "white";
    totalEl.style.marginBottom = "10px";
    calendarEl.before(totalEl);

    // ── 6. Month label row ────────────────────────────────────────────────
    const monthsRow  = document.createElement("div");
    monthsRow.classList.add("months");
    const seenMonths = new Set();

    buckets.forEach(bucket => {
      const cell     = document.createElement("div");
      cell.classList.add("month-cell");
      const firstDay = bucket.find(d => d !== null);
      if (firstDay) {
        // Parse as local noon to avoid UTC-midnight rollover issues
        const date = new Date(firstDay.date + "T12:00:00");
        const key  = `${date.getFullYear()}-${date.getMonth()}`;
        if (!seenMonths.has(key)) {
          cell.textContent = date.toLocaleString("en-US", { month: "short" });
          seenMonths.add(key);
        }
      }
      monthsRow.appendChild(cell);
    });

    // ── 7. Heatmap grid ───────────────────────────────────────────────────
    const weeksRow = document.createElement("div");
    weeksRow.classList.add("weeks");

    buckets.forEach(bucket => {
      const weekEl = document.createElement("div");
      weekEl.classList.add("week");

      bucket.forEach(day => {
        const dayEl = document.createElement("div");
        dayEl.classList.add("day");

        if (day === null) {
          dayEl.style.backgroundColor = "transparent";
        } else {
          dayEl.style.backgroundColor = getColor(day.contributionCount);
          dayEl.setAttribute(
            "data-title",
            `${day.date}: ${day.contributionCount} contribution${day.contributionCount !== 1 ? "s" : ""}`
          );
        }
        weekEl.appendChild(dayEl);
      });

      weeksRow.appendChild(weekEl);
    });

    calendarEl.appendChild(monthsRow);
    calendarEl.appendChild(weeksRow);
  });