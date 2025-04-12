import React, { useState, useRef, useEffect } from 'react'

type Option = {
  label: string
  description: string
  meta: string
  [key: string]: unknown
}

type EnhancedSelectProps<T extends Option> = {
  options: T[]
  value: T | null
  onChange: (option: T | null) => void
  placeholder?: string
}

function EnhancedSelect<T extends Option>({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
}: EnhancedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter((option) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      option.label.toLowerCase().includes(searchLower) ||
      option.description.toLowerCase().includes(searchLower) ||
      option.meta.toLowerCase().includes(searchLower)
    )
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
    }
  }

  const handleSelect = (option: T) => {
    onChange(option)
    setIsOpen(false)
    setSearchTerm('')
  }

  const renderOptionContent = (option: Option) => (
    <>
      <div className="option-label">{option.label}</div>
      <div className="option-description">{option.description}</div>
      <div className="option-meta">{option.meta}</div>
    </>
  )

  return (
    <div
      ref={containerRef}
      className="enhanced-select-container"
      style={{
        position: 'relative',
        width: '100%',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Main control */}
      <div
        className="select-control"
        onClick={toggleMenu}
        style={{
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px 12px',
          cursor: 'pointer',
          background: 'white',
          minHeight: '72px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {value ? (
          <div className="selected-option" style={{ lineHeight: 1.5 }}>
            {renderOptionContent(value)}
          </div>
        ) : (
          <div className="placeholder" style={{ lineHeight: 1.5 }}>
            <div className="option-label">{placeholder}</div>
            <div className="option-description" style={{ fontSize: '12px', color: '#555' }}>
              Select an option
            </div>
            <div className="option-meta" style={{ fontSize: '11px', color: '#999' }}>
              Click to open
            </div>
          </div>
        )}

        {/* Arrow indicator */}
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s ease',
          }}
        >
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L6 6L11 1" stroke="#888" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="select-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '80vh',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginTop: '4px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search input (sticky) */}
          <div
            className="search-container"
            style={{
              position: 'sticky',
              top: 0,
              padding: '8px',
              background: 'white',
              borderBottom: '1px solid #eee',
              zIndex: 2,
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list (scrollable) */}
          <div
            className="options-container"
            style={{
              overflowY: 'auto',
              maxHeight: 'calc(80vh - 60px)',
              padding: '4px 0',
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="option-item"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(option)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    lineHeight: 1.5,
                    borderBottom: index === filteredOptions.length - 1 ? 'none' : '1px solid #f5f5f5',
                    backgroundColor: value && JSON.stringify(value) === JSON.stringify(option) ? '#f0f7ff' : 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      value && JSON.stringify(value) === JSON.stringify(option) ? '#f0f7ff' : 'white'
                  }}
                >
                  <div className="option-label" style={{ fontSize: '14px' }}>
                    {option.label}
                  </div>
                  <div className="option-description" style={{ fontSize: '12px', color: '#555' }}>
                    {option.description}
                  </div>
                  <div className="option-meta" style={{ fontSize: '11px', color: '#999' }}>
                    {option.meta}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-options" style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const options: Option[] = [
  { label: 'Apple', description: 'Fruit from tree', meta: 'Red' },
  { label: 'Banana', description: 'Yellow fruit', meta: 'Tropical' },
  { label: 'Cherry', description: 'Red fruit', meta: 'Tree' },
  { label: 'Laptop', description: 'Apple device', meta: 'Electronics' },
  { label: 'Server', description: 'Network device', meta: 'Rack' },
  { label: 'Grape', description: 'Purple fruit', meta: 'Vine' },
  { label: 'Car', description: 'Vehicle for transport', meta: 'Red' },
  { label: 'Bike', description: 'Two-wheeled vehicle', meta: 'Green' },
  { label: 'Redwood', description: 'Tall tree', meta: 'California' },
  { label: 'Orange', description: 'Orange fruit', meta: 'Citrus' },
  { label: 'Router', description: 'Network device', meta: 'Electronics' },
  { label: 'Pineapple', description: 'Tropical fruit', meta: 'Yellow' },
  { label: 'Treehouse', description: 'House in a tree', meta: 'Wood' },
  { label: 'Monitor', description: 'Display device', meta: 'Apple' },
  { label: 'Tablet', description: 'Portable Apple device', meta: 'Screen' },
  { label: 'Strawberry', description: 'Red fruit', meta: 'Berry' },
  { label: 'Mango', description: 'Tropical yellow fruit', meta: 'Stone fruit' },
  { label: 'Cucumber', description: 'Green vegetable', meta: 'Fruit' },
  { label: 'Tomato', description: 'Red fruit or veg', meta: 'Salad' },
  { label: 'Pear', description: 'Green fruit', meta: 'Tree' },
]

export function App() {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null)

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto' }}>
      <EnhancedSelect
        options={options}
        value={selectedOption}
        onChange={setSelectedOption}
        placeholder="Select an item..."
      />
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
        <h3>Selected Value:</h3>
        <pre>{selectedOption ? JSON.stringify(selectedOption, null, 2) : 'Nothing selected'}</pre>
      </div>
    </div>
  )
}
