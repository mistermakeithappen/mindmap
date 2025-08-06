import { memo, useState } from 'react'
import { NodeProps } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface EmojiNodeData {
  emoji?: string
}

export const EmojiNode = memo(({ id, data = {}, selected }: NodeProps<EmojiNodeData>) => {
  const [emoji, setEmoji] = useState(data.emoji || '😊')
  const [isEditing, setIsEditing] = useState(false)

  const emojis = ['😊', '😎', '🤔', '💡', '❤️', '⭐', '🔥', '✨', '🎯', '🚀']

  return (
    <>
      <div className={`bg-white rounded-full shadow-lg p-4 ${selected ? 'ring-4 ring-indigo-500 ring-opacity-50' : ''}`}>
        <NodeHandles />
        {isEditing ? (
          <div className="grid grid-cols-5 gap-1 p-2 bg-gray-50 rounded-lg">
            {emojis.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setEmoji(e)
                  setIsEditing(false)
                }}
                className="text-2xl hover:bg-gray-200 rounded p-1 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <div
            className="text-6xl cursor-pointer hover:scale-110 transition-transform"
            onClick={() => setIsEditing(true)}
          >
            {emoji}
          </div>
        )}
      </div>
    </>
  )
})

EmojiNode.displayName = 'EmojiNode'