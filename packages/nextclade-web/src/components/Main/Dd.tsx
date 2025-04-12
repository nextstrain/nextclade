import { isEqual } from 'lodash'
import React, { useState, useMemo } from 'react'
import Select, { components, MenuListProps, SingleValue, ValueContainerProps } from 'react-select'
import Fuse from 'fuse.js'

type BaseOption = {
  label: string
  description: string
  meta: string
  [key: string]: unknown
}

type CustomSelectProps<OptionType extends BaseOption> = {
  options: OptionType[]
  value: OptionType | null
  onChange: (option: OptionType | null) => void
  searchKeys?: (keyof OptionType)[]
  formatOptionLabel?: (data: OptionType) => React.ReactNode
  getOptionLabel?: (data: OptionType) => string
  threshold?: number
  customStyles?: {
    primaryText?: React.CSSProperties
    secondaryText?: React.CSSProperties
    tertiaryText?: React.CSSProperties
  }
}

type CustomMenuListProps<OptionType> = MenuListProps<OptionType, false> & {
  search: string
  onSearch: (val: string) => void
}

function CustomMenuList<OptionType>(props: CustomMenuListProps<OptionType>) {
  const { children, search, onSearch, innerProps } = props

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'white',
          zIndex: 1,
          padding: '8px 12px',
          borderBottom: '1px solid #eee',
        }}
        // onMouseDown={(e) => e.stopPropagation()}
        // onClick={(e) => e.stopPropagation()}
      >
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
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
          // onMouseDown={(e) => e.stopPropagation()}
          // onClick={(e) => e.stopPropagation()}
          // onFocus={(e) => e.stopPropagation()}
        />
      </div>
      <div
        {...innerProps}
        style={{ maxHeight: 'calc(80vh - 60px)', overflowY: 'auto' }}
        // onMouseDown={(e) => e.stopPropagation()}
        // onClick={(e) => e.stopPropagation()}
        // onFocus={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function CustomValueContainer<OptionType>(props: ValueContainerProps<OptionType, false>) {
  const children = React.Children.toArray(props.children)
  const filtered = children.filter((child: any) => child?.type?.displayName !== 'Input')

  return <components.ValueContainer {...props}>{filtered}</components.ValueContainer>
}

const defaultStyles = {
  primaryText: { fontSize: '14px', color: '#000' },
  secondaryText: { fontSize: '12px', color: '#555' },
  tertiaryText: { fontSize: '11px', color: '#999' },
}

export function CustomSelect<OptionType extends BaseOption>({
  options,
  value,
  onChange,
  searchKeys = ['label', 'description', 'meta'],
  formatOptionLabel,
  getOptionLabel,
  threshold = 0.3,
  customStyles = {},
}: CustomSelectProps<OptionType>) {
  const [inputValue, setInputValue] = useState('')

  const styles = {
    primaryText: { ...defaultStyles.primaryText, ...customStyles.primaryText },
    secondaryText: { ...defaultStyles.secondaryText, ...customStyles.secondaryText },
    tertiaryText: { ...defaultStyles.tertiaryText, ...customStyles.tertiaryText },
  }

  const fuse = useMemo(() => new Fuse(options, { keys: searchKeys, threshold }), [options, searchKeys, threshold])

  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) return options
    const results = fuse.search(inputValue).map((r) => r.item)
    return value ? [value, ...results.filter((o) => o !== value)] : results
  }, [inputValue, fuse, options, value])

  const defaultGetOptionLabel = (option: OptionType) => `${option.label} ${option.description} ${option.meta}`

  const defaultFormatOptionLabel = (option: OptionType) => (
    <div style={{ lineHeight: 1.5 }}>
      <div style={styles.primaryText}>{option.label || ''}</div>
      <div style={styles.secondaryText}>{option.description || ''}</div>
      <div style={styles.tertiaryText}>{option.meta || ''}</div>
    </div>
  )

  const isOptionSelected = (option: OptionType, selectedValue: OptionType) => isEqual(option, selectedValue)

  return (
    <Select<OptionType, false>
      value={value}
      onChange={(val: SingleValue<OptionType>) => {
        onChange(val)
        setInputValue('')
      }}
      inputValue=""
      onInputChange={() => {}}
      options={filteredOptions}
      isSearchable
      openMenuOnClick
      openMenuOnFocus
      formatOptionLabel={formatOptionLabel || defaultFormatOptionLabel}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      isOptionSelected={isOptionSelected}
      components={{
        ...components,
        MenuList: (props) => <CustomMenuList<OptionType> {...props} search={inputValue} onSearch={setInputValue} />,
        ValueContainer: CustomValueContainer,
        Input: (props) => (
          <components.Input
            {...props}
            style={{
              height: 0,
              minHeight: 0,
              maxHeight: 0,
              opacity: 0,
              padding: 0,
              margin: 0,
              border: 0,
            }}
          />
        ),
        SingleValue: ({ data }) => (
          <div style={{ lineHeight: 1.5 }}>
            <div style={styles.primaryText}>{data.label || ''}</div>
            <div style={styles.secondaryText}>{data.description || ''}</div>
            <div style={styles.tertiaryText}>{data.meta || ''}</div>
          </div>
        ),
        Placeholder: (props) => (
          <components.Placeholder {...props}>
            <div style={{ lineHeight: 1.5 }}>
              <div style={styles.primaryText}>Select...</div>
              <div style={styles.secondaryText}>description</div>
              <div style={styles.tertiaryText}>meta</div>
            </div>
          </components.Placeholder>
        ),
      }}
      styles={{
        input: (base) => ({ ...base, display: 'none' }),
        control: (base) => ({
          ...base,
          minHeight: '72px',
          alignItems: 'flex-start',
          paddingTop: '6px',
          paddingBottom: '6px',
        }),
        menu: (base) => ({
          ...base,
          maxHeight: '80vh',
          position: 'absolute',
          zIndex: 9999,
          overflow: 'hidden',
        }),
        menuList: (base) => ({
          ...base,
          padding: '0',
          maxHeight: 'none',
        }),
        option: (base) => ({
          ...base,
          paddingTop: '6px',
          paddingBottom: '6px',
        }),
      }}
      menuPlacement="auto"
      menuPosition="absolute"
      menuShouldScrollIntoView
      menuPortalTarget={document.body}
      menuShouldBlockScroll={false}
      blurInputOnSelect={false}
      backspaceRemovesValue={false}
    />
  )
}

type MyOption = BaseOption

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
