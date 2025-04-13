import React, { useCallback, useState } from 'react'
import { Card } from 'reactstrap'
import { Layout } from 'src/components/Layout/Layout'
import { DropdownEnhancedBaseOption, DropdownEnhanced } from 'src/components/Common/DropdownEnhanced'
import { Landing } from 'src/components/Main/MainInputForm'
import styled from 'styled-components'

const Main = styled.div`
  display: flex;
  flex: 1 1 100%;
  overflow: hidden;
  padding: 0;
  margin: 0 auto;

  width: 100%;
  max-width: 1400px;
`

export function MainPage() {
  return (
    // <Layout>
    //   <Main>
    <div className="w-25">
      <App />
    </div>
    /* <Landing /> */
    // </Main>
    // </Layout>
  )
}

export function App() {
  const [selectedOption, setSelectedOption] = useState<ItemOption | undefined>(undefined)

  const getSearchKeys = useCallback((option: ItemOption) => {
    return [option.label, option.meta, option.description]
  }, [])

  return (
    <AppContainer>
      <DropdownEnhanced
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

interface ItemOption extends DropdownEnhancedBaseOption {
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

const AppContainer = styled.div`
  max-width: 500px;
  margin: 20px auto;
`

const ResultContainer = styled(Card)`
  margin-top: 20px;
  padding: 10px;
  border-radius: 4px;
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

const NoOptions = styled.div`
  padding: 12px;
  text-align: center;
  color: #999;
`
