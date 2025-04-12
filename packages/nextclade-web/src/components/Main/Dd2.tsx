import React, { useState, useRef, useEffect } from 'react'
import Select, {
  components,
  ControlProps,
  MenuProps,
  OptionProps,
  GroupBase,
  SingleValue,
  MultiValue,
  ActionMeta,
  ValueContainerProps,
} from 'react-select'
import styled from 'styled-components'
import { Input } from 'reactstrap'
import Fuse from 'fuse.js'

export interface OptionType {
  value: string
  label: string
  description: string
  meta: string
}

interface CustomSelectProps {
  options: OptionType[]
  value: OptionType | null
  onChange: (newValue: SingleValue<OptionType> | MultiValue<OptionType>, actionMeta: ActionMeta<OptionType>) => void
  placeholder?: string
  isMulti?: boolean
  isDisabled?: boolean
}

const OptionContainer = styled.div`
  padding: 8px;
  cursor: pointer;

  &:hover {
    background-color: #f8f9fa;
  }
`

const OptionLabel = styled.div`
  font-weight: 500;
`

const OptionDescription = styled.div`
  font-size: 0.85em;
  color: #6c757d;
`

const OptionMeta = styled.div`
  font-size: 0.75em;
  color: #adb5bd;
`

const SearchContainer = styled.div`
  padding: 8px;
  border-bottom: 1px solid #e9ecef;
`

const CustomOption = <Option extends OptionType, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: OptionProps<Option, IsMulti, Group>,
) => {
  const { data, isSelected, isFocused } = props
  const option = data as unknown as OptionType

  return (
    <components.Option {...props}>
      <OptionContainer
        style={{
          backgroundColor: isSelected ? '#007bff' : isFocused ? '#f8f9fa' : 'transparent',
          color: isSelected ? 'white' : 'inherit',
        }}
      >
        <OptionLabel>{option.label}</OptionLabel>
        <OptionDescription style={{ color: isSelected ? '#e6f2ff' : '#6c757d' }}>
          {option.description}
        </OptionDescription>
        <OptionMeta style={{ color: isSelected ? '#cce5ff' : '#adb5bd' }}>{option.meta}</OptionMeta>
      </OptionContainer>
    </components.Option>
  )
}

const CustomSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isMulti = false,
  isDisabled = false,
}: CustomSelectProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const fuse = useRef(
    new Fuse(options, {
      keys: ['label', 'description', 'meta'],
      threshold: 0.3,
      includeScore: true,
    }),
  )

  useEffect(() => {
    fuse.current = new Fuse(options, {
      keys: ['label', 'description', 'meta'],
      threshold: 0.3,
      includeScore: true,
    })
  }, [options])

  useEffect(() => {
    if (searchTerm) {
      const searchResults = fuse.current.search(searchTerm)
      setFilteredOptions(searchResults.map((result) => result.item))
    } else {
      setFilteredOptions(options)
    }
  }, [searchTerm, options])

  const Menu = <Option extends OptionType, IsMulti extends boolean, Group extends GroupBase<Option>>(
    props: MenuProps<Option, IsMulti, Group>,
  ) => {
    useEffect(() => {
      if (props.isOpen && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 0)
      }
    }, [props.isOpen])

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value)
    }

    return (
      <components.Menu {...props}>
        <SearchContainer>
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearchChange}
            size="sm"
          />
        </SearchContainer>
        {props.children}
      </components.Menu>
    )
  }

  const Control = <Option extends OptionType, IsMulti extends boolean, Group extends GroupBase<Option>>(
    props: ControlProps<Option, IsMulti, Group>,
  ) => {
    return <components.Control {...props} />
  }

  return (
    <Select
      value={value}
      onChange={onChange}
      options={filteredOptions}
      components={{
        Option: CustomOption,
        Menu,
        Control,
        // ValueContainer: CustomValueContainer,
      }}
      placeholder={placeholder}
      isMulti={isMulti}
      isDisabled={isDisabled}
      menuPortalTarget={document.body}
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base) => ({
          ...base,
          minHeight: value ? '80px' : base.minHeight,
          alignItems: 'flex-start',
          paddingTop: '4px',
          paddingBottom: '4px',
        }),
      }}
    />
  )
}

export const App = () => {
  const options: OptionType[] = [
    {
      value: '1',
      label: 'React',
      description: 'A JavaScript library for building user interfaces',
      meta: 'Created by Facebook',
    },
    {
      value: '2',
      label: 'Angular',
      description: 'Platform for building mobile and desktop web applications',
      meta: 'Developed by Google',
    },
    {
      value: '3',
      label: 'Vue',
      description: 'Progressive framework for building user interfaces',
      meta: 'Created by Evan You',
    },
    {
      value: '4',
      label: 'Svelte',
      description: 'Cybernetically enhanced web apps',
      meta: 'Developed by Rich Harris',
    },
    {
      value: '5',
      label: 'Preact',
      description: 'Fast 3kB alternative to React with the same API',
      meta: 'Lightweight virtual DOM',
    },
  ]

  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null)

  const handleChange = (
    newValue: SingleValue<OptionType> | MultiValue<OptionType>,
    actionMeta: ActionMeta<OptionType>,
  ) => {
    if (!Array.isArray(newValue)) {
      setSelectedOption(newValue)
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
      <h2>Framework Selector</h2>
      <CustomSelect
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder="Select a framework..."
      />

      {selectedOption && (
        <div style={{ marginTop: '20px' }}>
          <h3>Selected Option:</h3>
          <pre>{JSON.stringify(selectedOption, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default CustomSelect
