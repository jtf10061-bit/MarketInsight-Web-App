import { useState, useEffect, useRef } from 'react'

type TypingTextProps = {
  text: string
  speed?: number
  onDone?: () => void
}

/**
 * text を1文字ずつ表示するコンポーネント。
 * text が変わったら最初から打ち直したいので、呼び出し側で key に text を渡して
 * 作り直させる前提になっている（effect 内で displayed をリセットしない）。
 */
function TypingText({ text, speed = 30, onDone }: TypingTextProps) {
  const [displayed, setDisplayed] = useState("")
  const doneRef = useRef(false)

  // text ごとに key で作り直す前提なので、ここで displayed をリセットしない
  useEffect(() => {
    doneRef.current = false
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        if(!doneRef.current) {
          doneRef.current = true
          onDone?.()
        }
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text])

  return <span className={displayed.length < text.length ? 'typing-cursor': " "} >{displayed}</span>
}

export default TypingText
