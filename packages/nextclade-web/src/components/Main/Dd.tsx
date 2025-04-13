import { isEqual } from 'lodash'
import React, { useState, useRef, useEffect, useCallback, useMemo, ElementType } from 'react'
import { Card } from 'reactstrap'
import { FaChevronDown } from 'react-icons/fa'
import { SearchBox } from 'src/components/Common/SearchBox'
import { search } from 'src/helpers/search'
import styled from 'styled-components'

export interface BaseOption {
  [key: string]: unknown
}

export interface EnhancedSelectProps<T extends BaseOption> {
  options: T[]
  value: T | undefined
  onChange: (option: T | undefined) => void
  ControlComponent: ElementType<{ option: T | undefined }>
  ItemComponent: ElementType<{ option: T | undefined; isSelected: boolean }>
  EmptyOptionsComponent?: ElementType<Record<string, never>>
  searchKeys?: (option: T) => string[]
}

interface OptionItemProps<T extends BaseOption> {
  option: T
  isSelected: boolean
  onSelect: (option: T) => void
  registerRef?: (element: HTMLDivElement) => void
  ItemComponent: ElementType<{ option: T | undefined; isSelected: boolean }>
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

function OptionItemComponent<T extends BaseOption>(props: OptionItemProps<T>) {
  const { option, isSelected, onSelect, registerRef, ItemComponent } = props

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(option)
    },
    [option, onSelect],
  )

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSelected && registerRef && ref.current) {
      registerRef(ref.current)
    }
  }, [isSelected, registerRef])

  return (
    <OptionItem ref={ref} isSelected={isSelected} onClick={handleClick} data-selected={isSelected}>
      {ItemComponent ? <ItemComponent option={option} isSelected={isSelected} /> : null}
    </OptionItem>
  )
}

const MemoizedOptionItem = React.memo(OptionItemComponent) as <T extends BaseOption>(
  props: OptionItemProps<T>,
) => React.ReactElement

function EnhancedSelect<T extends BaseOption>({
  options,
  value,
  onChange,
  ControlComponent,
  ItemComponent,
  EmptyOptionsComponent,
  searchKeys = () => [],
}: EnhancedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [selectedItemElement, setSelectedItemElement] = useState<HTMLDivElement | null>(null)

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
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

  const registerSelectedItemRef = useCallback((element: HTMLDivElement) => {
    setSelectedItemElement(element)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClickOutside])

  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }

      if (selectedItemElement) {
        selectedItemElement.scrollIntoView({
          block: 'center',
          behavior: 'auto',
        })
      }
    }
  }, [isOpen, selectedItemElement])

  const filteredOptions = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return options
    }
    const { itemsStartWith, itemsInclude } = search(options, searchTerm, searchKeys)
    return [...itemsStartWith, ...itemsInclude]
  }, [options, searchTerm, searchKeys])

  const renderOptionsList = useMemo(() => {
    if (filteredOptions.length === 0) {
      return EmptyOptionsComponent ? <EmptyOptionsComponent /> : null
    }

    return filteredOptions.map((option) => (
      <MemoizedOptionItem
        key={JSON.stringify(option)}
        option={option}
        onSelect={handleSelect}
        isSelected={isEqual(value, option)}
        registerRef={isEqual(value, option) ? registerSelectedItemRef : undefined}
        ItemComponent={ItemComponent}
      />
    ))
  }, [filteredOptions, handleSelect, value, registerSelectedItemRef, ItemComponent, EmptyOptionsComponent])

  const renderMenu = useMemo(() => {
    if (!isOpen) {
      return null
    }

    return (
      <SelectMenu ref={menuRef}>
        <SearchContainer>
          <SearchBox searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
        </SearchContainer>
        <OptionsContainer>{renderOptionsList}</OptionsContainer>
      </SelectMenu>
    )
  }, [isOpen, searchTerm, renderOptionsList])

  return (
    <SelectContainer ref={containerRef}>
      <SelectControl onClick={toggleMenu}>
        <ControlComponent option={value} />
        <ArrowIndicator isOpen={isOpen}>
          <FaChevronDown />
        </ArrowIndicator>
      </SelectControl>
      {renderMenu}
    </SelectContainer>
  )
}

interface ItemOption extends BaseOption {
  label: string
  description: string
  meta: string
  [key: string]: unknown
}

const options: ItemOption[] = [
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

function renderOptionContent(option?: ItemOption) {
  if (!option) {
    return (
      <div>
        <OptionLabel>{'Select an item...'}</OptionLabel>
        <OptionDescription>{'Select an option'}</OptionDescription>
        <OptionMeta>{'Click to open'}</OptionMeta>
      </div>
    )
  }

  return (
    <>
      <OptionLabel>{option.label ?? ''}</OptionLabel>
      <OptionDescription>{option.description}</OptionDescription>
      <OptionMeta>{option.meta}</OptionMeta>
    </>
  )
}

function DefaultControl({ option }: { option?: ItemOption }) {
  return renderOptionContent(option)
}

function DefaultItem({ option }: { option?: ItemOption; isSelected: boolean }) {
  return renderOptionContent(option)
}

function EmptyOptions() {
  return <NoOptions>No matching items found</NoOptions>
}

export function App() {
  const [selectedOption, setSelectedOption] = useState<ItemOption | undefined>(undefined)

  const getSearchKeys = useCallback((option: ItemOption) => {
    return [option.label, option.meta, option.description]
  }, [])

  return (
    <AppContainer>
      <EnhancedSelect
        options={options}
        value={selectedOption}
        onChange={setSelectedOption}
        ControlComponent={DefaultControl}
        ItemComponent={DefaultItem}
        EmptyOptionsComponent={EmptyOptions}
        searchKeys={getSearchKeys}
      />
      <ResultContainer>
        <h3>Selected Value:</h3>
        <pre>{selectedOption ? JSON.stringify(selectedOption, null, 2) : 'Nothing selected'}</pre>
      </ResultContainer>
    </AppContainer>
  )
}
