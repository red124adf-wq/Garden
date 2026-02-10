document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("sidebar-container");
  if (!container) return;

  try {
    const response = await fetch("sidebar.html", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    container.innerHTML = html;

    const page = location.pathname.split("/").pop().replace(".html", "");

    container.querySelectorAll(".menu-btn").forEach((btn) => {
      if (btn.dataset.page === page) {
        btn.classList.add("active");
        btn.setAttribute("aria-current", "page");
      }

      if (btn.dataset.disabled === "true") {
        btn.addEventListener("click", (event) => {
          event.preventDefault();
        });
      }
    });
  } catch (err) {
    console.error("Sidebar load error:", err);
    container.innerHTML = "";
  }
});
