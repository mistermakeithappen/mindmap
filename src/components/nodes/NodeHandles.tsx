import { Handle, Position } from 'reactflow'

export function NodeHandles() {
  const handleStyle = {
    background: '#ef4444', // red-500
    width: 12,
    height: 12,
    border: '2px solid white',
    transition: 'all 0.2s ease-in-out',
    zIndex: 100, // Ensure handles are above other elements
  }

  const handleClassName = "hover:scale-125 shadow-md"

  return (
    <>
      <Handle 
        type="source" 
        position={Position.Top} 
        style={handleStyle}
        className={handleClassName}
        id="top"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={handleStyle}
        className={handleClassName}
        id="bottom"
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        style={handleStyle}
        className={handleClassName}
        id="left"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={handleStyle}
        className={handleClassName}
        id="right"
      />
    </>
  )
}