import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps, useReactFlow } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface TextNodeData {
  text?: string
  format?: 'plain' | 'bullet' | 'numbered' | 'checklist' | 'toggle'
  toggleStates?: Record<number, boolean> // Track which toggles are expanded
}

interface AIOption {
  title: string
  content: string
  reasoning: string
}

export const TextNode = memo(({ id, data, selected }: NodeProps<TextNodeData>) => {
  const [text, setText] = useState(data.text || '')
  const [format, setFormat] = useState<'plain' | 'bullet' | 'numbered' | 'checklist' | 'toggle'>(data.format || 'plain')
  const [toggleStates, setToggleStates] = useState<Record<number, boolean>>(data.toggleStates || {})
  const [isEditing, setIsEditing] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [aiOptions, setAiOptions] = useState<AIOption[]>([])
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const reactFlow = useReactFlow()

  // Auto-enter edit mode when selected and user types
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or other form element
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }
      
      // Check if node is selected, not editing, and user typed a character
      if (selected && !isEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setIsEditing(true)
        // Add the typed character to the end of text
        const newText = text + e.key
        setText(newText)
        updateNodeData({ text: newText })
      }
    }

    if (selected) {
      window.addEventListener('keypress', handleKeyPress)
      return () => window.removeEventListener('keypress', handleKeyPress)
    }
  }, [selected, isEditing, text])

  // Focus textarea at end when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end of formatted text
      const formattedLength = formatText(text).length
      textareaRef.current.setSelectionRange(formattedLength, formattedLength)
    }
  }, [isEditing])

  const updateNodeData = (updates: Partial<TextNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  const toggleLine = (lineIndex: number) => {
    const newStates = { ...toggleStates, [lineIndex]: !toggleStates[lineIndex] }
    console.log(`Toggling line ${lineIndex}: ${toggleStates[lineIndex]} -> ${newStates[lineIndex]}`)
    setToggleStates(newStates)
    updateNodeData({ toggleStates: newStates })
  }

  const handleTextChange = (value: string) => {
    setText(value)
    updateNodeData({ text: value })
  }

  const handleFormatChange = (newFormat: 'plain' | 'bullet' | 'numbered' | 'checklist' | 'toggle') => {
    setFormat(newFormat)
    updateNodeData({ format: newFormat })
    
    // Reset toggle states when switching formats
    if (newFormat !== 'toggle') {
      setToggleStates({})
      updateNodeData({ toggleStates: {} })
    }
    
    // If switching to a list format and text doesn't have list items, convert it
    if (newFormat !== 'plain' && !text.includes('\n')) {
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length === 1 && lines[0]) {
        // Convert single line to first list item
        handleTextChange(lines[0])
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle backspace at beginning of line
    if (e.key === 'Backspace' && format !== 'plain') {
      const textarea = e.currentTarget
      const cursorPos = textarea.selectionStart
      const currentValue = textarea.value
      const textBefore = currentValue.substring(0, cursorPos)
      
      // Get the current line
      const lines = textBefore.split('\n')
      const currentLineIndex = lines.length - 1
      const currentLine = lines[currentLineIndex]
      
      // Check if cursor is at or just after the list marker
      const markerMatch = currentLine.match(/^(\s*)([•▸▾☐☑]\s*|\d+\.\s*)(.*)$/)
      if (markerMatch) {
        const [, indent, marker, content] = markerMatch
        const markerEnd = indent.length + marker.length
        const posInLine = currentLine.length
        
        // If cursor is right after the marker and there's no content
        if (posInLine === markerEnd && !content) {
          e.preventDefault()
          
          // Remove current line and merge with previous
          lines.splice(currentLineIndex, 1)
          const newText = lines.join('\n') + currentValue.substring(cursorPos)
          
          // Update textarea directly
          textarea.value = newText
          
          // Clean and save
          const cleanedLines = newText.split('\n').map(line => {
            const indentMatch = line.match(/^(\s*)/)
            const indent = indentMatch ? indentMatch[1] : ''
            const trimmedLine = line.trim()
            
            if (format === 'bullet') return indent + trimmedLine.replace(/^[•·▸▹◦‣⁃]\s*/, '')
            else if (format === 'numbered') return indent + trimmedLine.replace(/^\d+\.\s*/, '')
            else if (format === 'checklist') return indent + trimmedLine.replace(/^[☐☑✓✗□☒]\s*/, '')
            else if (format === 'toggle') return indent + trimmedLine.replace(/^[▸▾▹▿]\s*/, '')
            return line
          }).join('\n')
          
          handleTextChange(cleanedLines)
          
          // Position cursor at end of previous line
          const newCursorPos = lines.join('\n').length
          setTimeout(() => {
            textarea.setSelectionRange(newCursorPos, newCursorPos)
          }, 0)
          
          return
        }
      }
    }
    
    // Only prevent default tab behavior when actively editing
    if (e.key === 'Tab' && isEditing) {
      e.preventDefault()
      const cursorPos = e.currentTarget.selectionStart
      const textBefore = text.substring(0, cursorPos)
      const textAfter = text.substring(cursorPos)
      
      if (e.shiftKey) {
        // Handle shift+tab (outdent)
        const lines = textBefore.split('\n')
        const currentLineIndex = lines.length - 1
        const currentLine = lines[currentLineIndex]
        
        // Remove one level of indentation (2 spaces or 1 tab)
        if (currentLine.startsWith('  ')) {
          lines[currentLineIndex] = currentLine.substring(2)
          const newText = lines.join('\n') + textAfter
          handleTextChange(newText)
          
          setTimeout(() => {
            if (textareaRef.current) {
              let newCursorPos = lines.join('\n').length
              
              // For toggle format, account for toggle markers
              if (format === 'toggle') {
                let markerAdjustment = 0
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i]
                  if (line.trim() || line.match(/^\s*$/)) {
                    markerAdjustment += 2 // ▾ + space
                  }
                }
                newCursorPos += markerAdjustment
              }
              
              textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
            }
          }, 0)
        } else if (currentLine.startsWith('\t')) {
          lines[currentLineIndex] = currentLine.substring(1)
          const newText = lines.join('\n') + textAfter
          handleTextChange(newText)
          
          setTimeout(() => {
            if (textareaRef.current) {
              let newCursorPos = lines.join('\n').length
              
              // For toggle format, account for toggle markers
              if (format === 'toggle') {
                let markerAdjustment = 0
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i]
                  if (line.trim() || line.match(/^\s*$/)) {
                    markerAdjustment += 2 // ▾ + space
                  }
                }
                newCursorPos += markerAdjustment
              }
              
              textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
            }
          }, 0)
        }
      } else {
        // Handle tab (indent)
        const indentStr = '  ' // Use 2 spaces for indentation
        const newText = textBefore + indentStr + textAfter
        handleTextChange(newText)
        
        // Set cursor position after the indent
        setTimeout(() => {
          if (textareaRef.current) {
            let newCursorPos = textBefore.length + indentStr.length
            
            // For toggle format, account for the toggle marker that formatText will add
            if (format === 'toggle') {
              // Count how many lines before this position will have toggle markers
              const linesBeforeCursor = (textBefore + indentStr).split('\n')
              const currentLineIndex = linesBeforeCursor.length - 1
              
              // Each line with content or proper indentation gets a toggle marker (▾ = 2 chars)
              let markerAdjustment = 0
              for (let i = 0; i <= currentLineIndex; i++) {
                const line = i < linesBeforeCursor.length ? linesBeforeCursor[i] : ''
                if (line.trim() || line.match(/^\s*$/)) {
                  markerAdjustment += 2 // ▾ + space
                }
              }
              newCursorPos += markerAdjustment
            }
            
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
          }
        }, 0)
      }
    } else if (e.key === 'Enter') {
      if (format === 'plain') {
        // For plain text, let default behavior handle it
        return
      }
      
      e.preventDefault()
      const textarea = e.currentTarget
      const cursorPos = textarea.selectionStart
      const currentValue = textarea.value
      const textBefore = currentValue.substring(0, cursorPos)
      const textAfter = currentValue.substring(cursorPos)
      
      // Get current line to preserve indentation
      const lines = textBefore.split('\n')
      const currentLine = lines[lines.length - 1]
      const indentMatch = currentLine.match(/^(\s*)/)
      const currentIndent = indentMatch ? indentMatch[1] : ''
      
      // Clean the current line to check if it has content after the marker
      let cleanedLine = currentLine.trim()
      if (format === 'bullet') cleanedLine = cleanedLine.replace(/^[•·▸▹◦‣⁃]\s*/, '')
      else if (format === 'numbered') cleanedLine = cleanedLine.replace(/^\d+\.\s*/, '')
      else if (format === 'checklist') cleanedLine = cleanedLine.replace(/^[☐☑✓✗□☒]\s*/, '')
      else if (format === 'toggle') cleanedLine = cleanedLine.replace(/^[▸▾▹▿]\s*/, '')
      
      // Add appropriate list marker for new line
      let newLine = '\n' + currentIndent
      
      // For toggle format, check if we should add a marker
      if (format === 'toggle') {
        // Always add toggle marker for new lines
        newLine += ''  // Don't add marker here, let formatText handle it
      } else if (cleanedLine) {
        // For other formats, only add if current line has content
        if (format === 'bullet') newLine += '• '
        else if (format === 'numbered') {
          const lineNumber = (currentValue.split('\n').filter(l => l.trim() && l.match(/^\s*\d+\./)).length + 1)
          newLine += `${lineNumber}. `
        } else if (format === 'checklist') newLine += '☐ '
      }
      
      // Insert the new line at cursor position
      const newValue = textBefore + newLine + textAfter
      
      // Update the textarea value directly for immediate visual feedback
      textarea.value = newValue
      
      // For toggle format, we need to preserve indentation when cleaning
      const cleanedLines = newValue.split('\n').map(line => {
        // Get indentation
        const indentMatch = line.match(/^(\s*)/)
        const indent = indentMatch ? indentMatch[1] : ''
        const trimmedLine = line.trim()
        
        if (format === 'bullet') return indent + trimmedLine.replace(/^[•·▸▹◦‣⁃]\s*/, '')
        else if (format === 'numbered') return indent + trimmedLine.replace(/^\d+\.\s*/, '')
        else if (format === 'checklist') return indent + trimmedLine.replace(/^[☐☑✓✗□☒]\s*/, '')
        else if (format === 'toggle') return indent + trimmedLine.replace(/^[▸▾▹▿]\s*/, '')
        return line
      }).join('\n')
      
      handleTextChange(cleanedLines)
      
      // Set cursor position immediately
      let newCursorPos = textBefore.length + newLine.length
      
      // For toggle format, account for toggle markers that formatText will add
      if (format === 'toggle') {
        const linesUpToCursor = (textBefore + newLine).split('\n')
        let markerAdjustment = 0
        for (let i = 0; i < linesUpToCursor.length; i++) {
          const line = linesUpToCursor[i]
          if (line.trim() || line.match(/^\s*$/)) {
            markerAdjustment += 2 // ▾ + space
          }
        }
        newCursorPos += markerAdjustment
      }
      
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }
  }

  const formatText = (text: string, hideCollapsed = false) => {
    if (format === 'plain') return text
    
    const lines = text.split('\n')
    const formattedLines: string[] = []
    let skipUntilNextToggle = false
    let currentToggleDepth = 0
    
    lines.forEach((line, index) => {
      // Get indentation level
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''
      const indentLevel = Math.floor(indent.length / 2)
      
      // Remove existing markers to get clean content
      let cleanLine = line.trimStart()
      if (format === 'bullet') {
        cleanLine = cleanLine.replace(/^[•·▸▹◦‣⁃]\s*/, '')
        if (cleanLine || line.trim()) formattedLines.push(indent + `• ${cleanLine}`)
        else formattedLines.push(line)
      } else if (format === 'numbered') {
        cleanLine = cleanLine.replace(/^\d+\.\s*/, '')
        if (cleanLine || line.trim()) {
          const num = formattedLines.filter(l => l.match(/^\s*\d+\./)).length + 1
          formattedLines.push(indent + `${num}. ${cleanLine}`)
        } else formattedLines.push(line)
      } else if (format === 'checklist') {
        cleanLine = cleanLine.replace(/^[☐☑✓✗□☒]\s*/, '')
        const wasChecked = line.match(/^[☑✓☒]/)
        if (cleanLine || line.trim()) formattedLines.push(indent + `${wasChecked ? '☑' : '☐'} ${cleanLine}`)
        else formattedLines.push(line)
      } else if (format === 'toggle') {
        // For toggle format, show toggle marker immediately, even on empty lines
        cleanLine = cleanLine.replace(/^[▸▾▹▿]\s*/, '')
        
        // Always show toggle for lines with proper indentation (including empty ones in edit mode)
        if (cleanLine || (!hideCollapsed && line.match(/^\s*$/))) {
          // This is either a content line or an empty line in edit mode
          const isExpanded = toggleStates[index] !== false
          formattedLines.push(indent + `${isExpanded ? '▾' : '▸'} ${cleanLine}`)
          
          // Skip subsequent lines that are more indented if collapsed
          if (!isExpanded && hideCollapsed && cleanLine) {
            skipUntilNextToggle = true
            currentToggleDepth = indentLevel
          } else {
            skipUntilNextToggle = false
          }
        } else if (indentLevel > currentToggleDepth && skipUntilNextToggle) {
          // Skip this line - it's nested under a collapsed toggle
          return
        } else {
          // Completely empty line (no indent) - just pass through
          formattedLines.push(line)
          if (indentLevel <= currentToggleDepth) {
            skipUntilNextToggle = false
          }
        }
      } else {
        formattedLines.push(line)
      }
    })
    
    return formattedLines.join('\n')
  }

  const toggleChecklistItem = (lineIndex: number) => {
    if (format !== 'checklist') return
    
    const lines = text.split('\n')
    if (lines[lineIndex]) {
      lines[lineIndex] = lines[lineIndex].replace(/^☐/, '☑').replace(/^☑/, '☐')
      handleTextChange(lines.join('\n'))
    }
  }

  const handleAIAnalysis = async () => {
    if (!text.trim() || !instructions.trim()) {
      setError('Please enter both text and instructions')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ai/text-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, instructions }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze text')
      }

      setAiOptions(data.options || [])
    } catch (error) {
      console.error('AI analysis error:', error)
      setError(error instanceof Error ? error.message : 'Failed to analyze text')
    } finally {
      setIsLoading(false)
    }
  }

  const applyOption = (option: AIOption) => {
    handleTextChange(option.content)
    setShowAI(false)
    setAiOptions([])
    setInstructions('')
  }

  return (
    <>
      <div className={`relative bg-white rounded-lg shadow-md border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} min-w-[300px] min-h-[200px] flex flex-col overflow-hidden`}>
        <NodeHandles />
        
        {/* Main text area */}
        <div className="flex-1 relative overflow-hidden">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={formatText(text)}
              onChange={(e) => {
                // Remove formatting markers when saving but preserve indentation
                const lines = e.target.value.split('\n')
                const cleanedText = lines.map(line => {
                  // Get indentation
                  const indentMatch = line.match(/^(\s*)/)
                  const indent = indentMatch ? indentMatch[1] : ''
                  const trimmedLine = line.trim()
                  
                  if (format === 'bullet') {
                    return indent + trimmedLine.replace(/^[•·▸▹◦‣⁃]\s*/, '')
                  } else if (format === 'numbered') {
                    return indent + trimmedLine.replace(/^\d+\.\s*/, '')
                  } else if (format === 'checklist') {
                    return indent + trimmedLine.replace(/^[☐☑✓✗□☒]\s*/, '')
                  } else if (format === 'toggle') {
                    return indent + trimmedLine.replace(/^[▸▾▹▿]\s*/, '')
                  }
                  return line
                }).join('\n')
                handleTextChange(cleanedText)
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setIsEditing(false)}
              className="absolute inset-0 resize-none outline-none text-gray-800 whitespace-pre-wrap p-4"
              placeholder={
                format === 'bullet' ? '• Enter bullet points...' :
                format === 'numbered' ? '1. Enter numbered items...' :
                format === 'checklist' ? '☐ Enter checklist items...' :
                format === 'toggle' ? '▸ Enter toggle list items...' :
                'Enter your text...'
              }
              autoFocus
            />
          ) : (
            <div 
              onClick={() => setIsEditing(true)} 
              className="absolute inset-0 cursor-text text-gray-800 whitespace-pre-wrap p-4 overflow-auto"
            >
              {formatText(text, true) || (
                <span className="text-gray-400">
                  {format === 'bullet' ? 'Click to add bullet points...' :
                   format === 'numbered' ? 'Click to add numbered items...' :
                   format === 'checklist' ? 'Click to add checklist items...' :
                   format === 'toggle' ? 'Click to add toggle lists...' :
                   'Click to edit...'}
                </span>
              )}
              {format === 'checklist' && !isEditing && text && (
                <div className="absolute inset-0 pointer-events-none">
                  {text.split('\n').map((line, index) => {
                    const isCheckbox = line.match(/^[☐☑]/)
                    if (!isCheckbox) return null
                    
                    return (
                      <div
                        key={index}
                        className="absolute h-6 w-6 cursor-pointer pointer-events-auto"
                        style={{ 
                          top: `${16 + index * 24}px`,
                          left: '16px',
                          opacity: 0 
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleChecklistItem(index)
                        }}
                      />
                    )
                  })}
                </div>
              )}
              {format === 'toggle' && !isEditing && text && (
                <div className="absolute inset-0 pointer-events-none">
                  {(() => {
                    const rawLines = text.split('\n')
                    const formattedText = formatText(text, true)
                    const formattedLines = formattedText.split('\n')
                    const clickAreas: JSX.Element[] = []
                    
                    // Create a mapping of visible formatted lines to original line indices
                    let formattedIndex = 0
                    
                    for (let rawIndex = 0; rawIndex < rawLines.length; rawIndex++) {
                      const rawLine = rawLines[rawIndex]
                      
                      // Skip completely empty lines
                      if (!rawLine.trim()) continue
                      
                      // Check if this line is visible in formatted output
                      const formattedLine = formattedLines[formattedIndex]
                      if (!formattedLine) continue
                      
                      // Get indentation for positioning
                      const indentMatch = rawLine.match(/^(\s*)/)
                      const indent = indentMatch ? indentMatch[1].length : 0
                      
                      clickAreas.push(
                        <div
                          key={`toggle-${rawIndex}`}
                          className="absolute w-8 h-6 cursor-pointer hover:bg-blue-100 rounded-sm flex items-center justify-center pointer-events-auto transition-all duration-200 border border-transparent hover:border-blue-200"
                          style={{ 
                            top: `${16 + formattedIndex * 24}px`,
                            left: `${12 + indent * 8}px`,
                            fontSize: '12px',
                            lineHeight: '24px',
                          }}
                          onClick={(e) => {
                            console.log(`Clicked toggle for line ${rawIndex}`)
                            e.stopPropagation()
                            toggleLine(rawIndex)
                          }}
                          title={`Click to ${toggleStates[rawIndex] === false ? 'expand' : 'collapse'} toggle`}
                        >
                          <span className="text-gray-700 select-none font-bold">
                            {toggleStates[rawIndex] === false ? '▶' : '▼'}
                          </span>
                        </div>
                      )
                      
                      formattedIndex++
                    }
                    
                    return clickAreas
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Format Toolbar - Show above node when selected */}
      {selected && (
        <div 
          className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-2 animate-fadeInUp"
          style={{
            bottom: 'calc(100% + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: 'max-content',
            pointerEvents: 'auto',
          }}
        >
          {/* Arrow pointing down to node */}
          <div 
            className="absolute w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45"
            style={{
              bottom: '-8px',
              left: '50%',
              marginLeft: '-8px',
            }}
          />
          
          <div className="flex gap-1">
            <button
              onClick={() => handleFormatChange('plain')}
              className={`group relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                format === 'plain' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Plain text"
            >
              <span className="relative z-10">Plain</span>
              {format === 'plain' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            
            <div className="w-px bg-gray-200" />
            
            <button
              onClick={() => handleFormatChange('bullet')}
              className={`group relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                format === 'bullet' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Bullet list"
            >
              <span className="relative z-10 flex items-center gap-1">
                <span className="text-lg leading-none">•</span> Bullets
              </span>
              {format === 'bullet' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            
            <button
              onClick={() => handleFormatChange('numbered')}
              className={`group relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                format === 'numbered' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Numbered list"
            >
              <span className="relative z-10 flex items-center gap-1">
                <span className="font-mono">1.</span> Numbers
              </span>
              {format === 'numbered' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            
            <button
              onClick={() => handleFormatChange('checklist')}
              className={`group relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                format === 'checklist' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Checklist"
            >
              <span className="relative z-10 flex items-center gap-1">
                <span className="text-lg leading-none">☐</span> Checklist
              </span>
              {format === 'checklist' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            
            <button
              onClick={() => handleFormatChange('toggle')}
              className={`group relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                format === 'toggle' 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              title="Toggle List"
            >
              <span className="relative z-10 flex items-center gap-1">
                <span className="text-lg leading-none">▸</span> Toggle
              </span>
              {format === 'toggle' && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis Panel - Only show when selected and has text */}
      {selected && text.trim() && (
        <div 
          className="absolute w-80 bg-white rounded-lg shadow-2xl border border-gray-200 animate-fadeInDown"
          style={{
            top: 'calc(100% + 20px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            pointerEvents: 'auto',
          }}
        >
          {/* Arrow pointing to node */}
          <div 
            className="absolute w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45"
            style={{
              top: '-8px',
              left: '50%',
              marginLeft: '-8px',
            }}
          />
          
          <div className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>✨</span> AI Analysis
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Instructions
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., Make it more formal, Generate questions, Create bullet points..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>

            <button
              onClick={handleAIAnalysis}
              disabled={isLoading || !instructions.trim()}
              className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-md hover:from-purple-600 hover:to-indigo-600 disabled:bg-gray-300 transition-all text-sm font-medium"
            >
              {isLoading ? 'Analyzing...' : 'Generate Options'}
            </button>

            {error && (
              <div className="text-xs text-red-600">{error}</div>
            )}

            {/* AI Options */}
            {aiOptions.length > 0 && (
              <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700">AI Suggestions:</h4>
                {aiOptions.map((option, index) => (
                  <div key={index} className="bg-gray-50 rounded-md border border-gray-200 p-3">
                    <h5 className="font-medium text-sm text-gray-800 mb-1">{option.title}</h5>
                    <p className="text-xs text-gray-600 mb-2">{option.reasoning}</p>
                    <div className="text-sm text-gray-700 mb-2 line-clamp-3">{option.content}</div>
                    <button
                      onClick={() => applyOption(option)}
                      className="text-xs px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                    >
                      Apply This Option
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
})

TextNode.displayName = 'TextNode'