document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  try {
    // 1. Завантажуємо sidebar.html
    const res = await fetch("sidebar.html");
    const html = await res.text();
    container.innerHTML = html;

    // 2. Визначаємо поточну сторінку
    const page = location.pathname.split("/").pop().replace(".html", "");

    // 3. Проставляємо active
    container.querySelectorAll(".menu-btn").forEach(btn => {
      if (btn.dataset.page === page) {
        btn.classList.add("active");
      }
    });

  } catch (err) {
    console.error("Sidebar load error:", err);
  }
});
