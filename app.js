const yearEl = document.getElementById('year');
const helloBtn = document.getElementById('helloBtn');
const helloMessage = document.getElementById('helloMessage');

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

if (helloBtn && helloMessage) {
  helloBtn.addEventListener('click', () => {
    helloMessage.textContent = 'Дякуємо за інтерес! Ми зв’яжемося з вами найближчим часом 💚';
  });
}
