const color = () => {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const a = 0.8;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// When DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  const icons = document.querySelectorAll('.dynamic-color-icon');
  icons.forEach(icon => {
    icon.style.setProperty('color', color(), 'important');
  });
});