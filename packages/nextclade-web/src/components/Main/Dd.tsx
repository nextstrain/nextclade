import { isEqual } from 'lodash'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Card, Input } from 'reactstrap'
import { FaChevronDown } from 'react-icons/fa'
import styled from 'styled-components'

interface Option {
  label: string
  description: string
  meta: string
  [key: string]: unknown
}

interface EnhancedSelectProps<T extends Option> {
  options: T[]
  value: T | null
  onChange: (option: T | null) => void
  placeholder?: string
}

const SelectContainer = styled.div`
  position: relative;
  width: 100%;
  font-family: sans-serif;
`

const SelectControl = styled.div`
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  background: white;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
`

const OptionLabel = styled.div`
  font-size: 14px;
`

const OptionDescription = styled.div`
  font-size: 12px;
  color: #555;
`

const OptionMeta = styled.div`
  font-size: 11px;
  color: #999;
`

const ArrowIndicator = styled.div<{ isOpen: boolean }>`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%) rotate(${(props) => (props.isOpen ? '180deg' : '0deg')});
  transition: transform 0.2s ease;
`

const SelectMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 80vh;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 4px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
`

const SearchContainer = styled.div`
  position: sticky;
  top: 0;
  padding: 8px;
  background: white;
  border-bottom: 1px solid #eee;
  z-index: 2;
`

const OptionsContainer = styled.div`
  overflow-y: auto;
  max-height: calc(80vh - 60px);
  padding: 4px 0;
`

const OptionItem = styled.div<{ isSelected: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  line-height: 1.5;
  border-bottom: 1px solid #f5f5f5;
  background-color: ${(props) => (props.isSelected ? '#f0f7ff' : 'white')};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #f5f5f5;
  }
`

const NoOptions = styled.div`
  padding: 12px;
  text-align: center;
  color: #999;
`

const ResultContainer = styled(Card)`
  margin-top: 20px;
  padding: 10px;
  border-radius: 4px;
`

const stopPropagation = (e: React.MouseEvent) => {
  e.stopPropagation()
}

const renderOptionContent = (option: Option) => (
  <>
    <OptionLabel>{option.label}</OptionLabel>
    <OptionDescription>{option.description}</OptionDescription>
    <OptionMeta>{option.meta}</OptionMeta>
  </>
)

const filterOptions = (options: Option[], searchTerm: string) => {
  const searchLower = searchTerm.toLowerCase()
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchLower) ||
      option.description.toLowerCase().includes(searchLower) ||
      option.meta.toLowerCase().includes(searchLower),
  )
}

const isOptionSelected = (value: Option | null, option: Option) => {
  return value !== null && JSON.stringify(value) === JSON.stringify(option)
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

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const toggleMenu = useCallback(() => {
    setIsOpen((prevIsOpen) => {
      if (!prevIsOpen) {
        setSearchTerm('')
      }
      return !prevIsOpen
    })
  }, [])

  const handleSelect = useCallback(
    (option: T) => {
      onChange(option)
      setIsOpen(false)
      setSearchTerm('')
    },
    [onChange],
  )

  const handleOptionClick = useCallback(
    (e: React.MouseEvent, option: T) => {
      stopPropagation(e)
      handleSelect(option)
    },
    [handleSelect],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClickOutside])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const filteredOptions = useMemo(() => filterOptions(options, searchTerm), [options, searchTerm])

  return (
    <SelectContainer ref={containerRef}>
      <SelectControl onClick={toggleMenu}>
        {value ? (
          <div className="selected-option">{renderOptionContent(value)}</div>
        ) : (
          <div className="placeholder">
            <OptionLabel>{placeholder}</OptionLabel>
            <OptionDescription>Select an option</OptionDescription>
            <OptionMeta>Click to open</OptionMeta>
          </div>
        )}

        <ArrowIndicator isOpen={isOpen}>
          <FaChevronDown />
        </ArrowIndicator>
      </SelectControl>

      {isOpen && (
        <SelectMenu ref={menuRef}>
          <SearchContainer>
            <Input
              innerRef={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              placeholder="Search..."
              onClick={stopPropagation}
            />
          </SearchContainer>

          <OptionsContainer>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <OptionItem
                  key={option.label}
                  isSelected={isEqual(value, option)}
                  onClick={(e) => handleOptionClick(e, option)}
                >
                  {renderOptionContent(option)}
                </OptionItem>
              ))
            ) : (
              <NoOptions>No options found</NoOptions>
            )}
          </OptionsContainer>
        </SelectMenu>
      )}
    </SelectContainer>
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

const AppContainer = styled.div`
  max-width: 500px;
  margin: 20px auto;
`

export function App() {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null)

  return (
    <AppContainer>
      <EnhancedSelect
        options={options}
        value={selectedOption}
        onChange={setSelectedOption}
        placeholder="Select an item..."
      />
      <ResultContainer>
        <h3>Selected Value:</h3>
        <pre>{selectedOption ? JSON.stringify(selectedOption, null, 2) : 'Nothing selected'}</pre>
      </ResultContainer>
    </AppContainer>
  )
}
