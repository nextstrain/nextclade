import React, { useState, useMemo } from 'react'
import Select, { components, MenuListProps, SingleValue } from 'react-select'
import Fuse from 'fuse.js'

type BaseOption = {
  [key: string]: string
}

type CustomSelectProps<OptionType extends BaseOption> = {
  options: OptionType[]
  value: OptionType | null
  onChange: (option: OptionType | null) => void
  searchKeys: (keyof OptionType)[]
  formatOptionLabel: (data: OptionType) => React.ReactNode
  getOptionLabel: (data: OptionType) => string
}

type CustomMenuListProps<OptionType> = MenuListProps<OptionType, false> & {
  search: string
  onSearch: (val: string) => void
}

function CustomMenuList<OptionType>(props: CustomMenuListProps<OptionType>) {
  const { children, search, onSearch, innerRef } = props

  return (
    <div ref={innerRef} style={{ maxHeight: 600, overflowY: 'auto' }}>
      <div style={{ padding: '8px 12px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search..."
          autoFocus
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '14px',
            marginBottom: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        />
      </div>
      {children}
    </div>
  )
}

export function CustomSelect<OptionType extends BaseOption>({
  options,
  value,
  onChange,
  searchKeys,
  formatOptionLabel,
  getOptionLabel,
}: CustomSelectProps<OptionType>) {
  const [inputValue, setInputValue] = useState('')

  const fuse = useMemo(() => new Fuse(options, { keys: searchKeys, threshold: 0.3 }), [options, searchKeys])

  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) return options
    return fuse.search(inputValue).map((r) => r.item)
  }, [inputValue, fuse, options])

  return (
    <Select<OptionType, false>
      value={value}
      onChange={(val: SingleValue<OptionType>) => onChange(val)}
      inputValue={inputValue}
      onInputChange={(val) => setInputValue(val)}
      options={filteredOptions}
      isSearchable
      formatOptionLabel={formatOptionLabel}
      getOptionLabel={getOptionLabel}
      components={{
        MenuList: (props) => <CustomMenuList<OptionType> {...props} search={inputValue} onSearch={setInputValue} />,
        SingleValue: ({ data }) => (
          <div style={{ lineHeight: 1.5 }}>
            <div>{data.label}</div>
            <div style={{ fontSize: 12, color: '#555' }}>{data.description}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{data.meta}</div>
          </div>
        ),
        Placeholder: (props) => (
          <components.Placeholder {...props}>
            <div style={{ lineHeight: 1.5 }}>
              <div>Select...</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>description</div>
              <div style={{ fontSize: 11, color: '#ccc' }}>meta</div>
            </div>
          </components.Placeholder>
        ),
      }}
      styles={{
        input: (base) => ({ ...base, display: 'none' }),
        control: (base) => ({
          ...base,
          minHeight: '72px', // match 3-line item height
          alignItems: 'flex-start',
          paddingTop: '6px',
          paddingBottom: '6px',
        }),
        menu: (base) => ({
          ...base,
          maxHeight: '600px',
          position: 'absolute',
          zIndex: 9999,
        }),
        menuList: (base) => ({
          ...base,
          maxHeight: 'inherit',
          overflowY: 'auto',
        }),
      }}
      menuPlacement="auto"
      menuPosition="absolute"
      menuShouldScrollIntoView
    />
  )
}

type MyOption = {
  label: string
  description: string
  meta: string
}

const options: MyOption[] = [
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
  const [value, setValue] = useState<MyOption | null>(null)

  return (
    <CustomSelect<MyOption>
      options={options}
      value={value}
      onChange={setValue}
      searchKeys={['label', 'description', 'meta']}
      formatOptionLabel={(opt) => (
        <div style={{ lineHeight: 1.5 }}>
          <div>{opt.label}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{opt.description}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{opt.meta}</div>
        </div>
      )}
      getOptionLabel={(opt) => `${opt.label} ${opt.description} ${opt.meta}`}
    />
  )
}
