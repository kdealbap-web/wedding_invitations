import { useEffect } from 'react'

function spawnPetal() {
  const p = document.createElement('div')
  p.className = 'petal'
  const t = Math.random()
  let radius, bg, extra = '', sz
  if (t < 0.58) {
    sz = 6 + Math.random() * 10
    radius = '50% 0 50% 0'
    bg = `hsl(${12 + Math.random() * 20},${50 + Math.random() * 30}%,${70 + Math.random() * 15}%)`
  } else if (t < 0.72) {
    sz = 9 + Math.random() * 6; radius = '50%'; bg = 'transparent'
    extra = `;border:1.5px solid oklch(${74 + Math.random() * 10}% 0.10 78)`
  } else if (t < 0.86) {
    sz = 5 + Math.random() * 8; radius = '2px'
    bg = `oklch(${66 + Math.random() * 16}% 0.09 ${35 + Math.random() * 48}%)`
    extra = ';transform:rotate(45deg)'
  } else {
    sz = 4 + Math.random() * 6; radius = '50%'
    bg = `oklch(${72 + Math.random() * 12}% 0.07 ${28 + Math.random() * 52}%)`
  }
  p.style.cssText = [
    `width:${sz}px`, `height:${sz}px`,
    `left:${Math.random() * 100}vw`, `top:-30px`,
    `background:${bg}`, `border-radius:${radius}`,
    `animation-duration:${7 + Math.random() * 8}s`,
    `animation-delay:${Math.random() * 4}s`,
    `opacity:0`,
  ].join(';') + extra
  document.body.appendChild(p)
  setTimeout(() => p.remove(), (15 + Math.random() * 5) * 1000)
}

export default function PetalRain() {
  useEffect(() => {
    for (let i = 0; i < 14; i++) setTimeout(spawnPetal, i * 220)
    const id = setInterval(spawnPetal, 2800)
    return () => clearInterval(id)
  }, [])
  return null
}
