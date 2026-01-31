const username = "PajiiMarr";
const year = 2026;

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

fetch(`http://localhost:8080/api/github-contributions?username=${username}&year=${year}`)
.then(res => res.json())
.then(data => {
    const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks;
    const calendarEl = document.getElementById("calendar");

    const allDays = weeks.map((week, wi) => {
        return week.contributionDays.map(day => ({...day, weekIndex: wi}));
    }).flat();

    const months = {};
    allDays.forEach(day => {
        const dateObj = new Date(day.date);
        const month = dateObj.getMonth(); // 0-11
        if (!months[month]) months[month] = [];
        months[month].push(day);
    });

    Object.keys(months).forEach(monthIndex => {
        const monthEl = document.createElement("div");
        monthEl.classList.add("month");

        const monthNameEl = document.createElement("div");
        monthNameEl.classList.add("month-name");
        monthNameEl.textContent = monthNames[monthIndex];
        monthEl.appendChild(monthNameEl);

        // Build weeks for this month
        const monthDays = months[monthIndex];
        const maxWeeks = Math.max(...monthDays.map(d => d.weekIndex)) + 1;
        const weeksEl = document.createElement("div");
        weeksEl.classList.add("weeks");

        for(let wi = 0; wi < maxWeeks; wi++) {
            const weekEl = document.createElement("div");
            weekEl.classList.add("week");

            monthDays.filter(d => d.weekIndex === wi).forEach(day => {
                const dayEl = document.createElement("div");
                dayEl.classList.add("day");
                dayEl.style.backgroundColor = day.color;
                dayEl.setAttribute("data-title", `${day.date}: ${day.contributionCount} contributions`);
                weekEl.appendChild(dayEl);
            });

            weeksEl.appendChild(weekEl);
        }

        monthEl.appendChild(weeksEl);
        calendarEl.appendChild(monthEl);
    });
});