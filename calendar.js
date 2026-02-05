/* ======================================================
   КАЛЕНДАР (flatpickr, uk)
====================================================== */

flatpickr("#calendar", {
  locale: "uk",
  dateFormat: "d.m.Y",
  defaultDate: "today",

  onDayCreate: function(dObj, dStr, fp, dayElem) {
    const date = dayElem.dateObj;
    const day = date.getDay(); // 0 = Нд, 6 = Сб
    const mmdd = String(date.getMonth() + 1).padStart(2, "0") + "-" +
                 String(date.getDate()).padStart(2, "0");

    // Вихідні
    if (day === 0 || day === 6) {
      dayElem.classList.add("is-weekend");
    }

     // Свята
    if (HOLIDAYS_UA[mmdd]) {
		dayElem.classList.add("is-holiday");
		dayElem.title = HOLIDAYS_UA[mmdd];
	}
  }
});
