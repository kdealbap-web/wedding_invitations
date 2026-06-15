import { useState, useImperativeHandle, forwardRef, useRef } from 'react'

const Toast = forwardRef((_, ref) => {
  const [msg, setMsg]     = useState('')
  const [show, setShow]   = useState(false)
  const timerRef          = useRef(null)

  useImperativeHandle(ref, () => ({
    show(message) {
      clearTimeout(timerRef.current)
      setMsg(message)
      setShow(true)
      timerRef.current = setTimeout(() => setShow(false), 4000)
    },
  }))

  return (
    <div id="toast" role="status" aria-live="polite" className={show ? 'show' : ''}>
      {msg}
    </div>
  )
})
Toast.displayName = 'Toast'
export default Toast
