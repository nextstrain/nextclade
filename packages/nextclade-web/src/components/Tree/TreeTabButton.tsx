import styled from 'styled-components'
import { SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'

/** Colors of the Auspice tree buttons ("Zoom to Selected", "Zoom to Root") next to the tree tab buttons */
const AUSPICE_BUTTON = {
  color: '#333',
  disabledColor: '#bbb',
  iconColor: '#888',
  border: '#ccc',
}

/** Space between neighboring Auspice tree buttons */
export const TREE_TAB_BUTTON_GAP_PX = 4

/** Row of tree tab buttons, hanging from the top of the tree card like the Auspice tree buttons */
export const TreeTabButtonGroup = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-self: flex-start;
  gap: ${TREE_TAB_BUTTON_GAP_PX}px;
`

/** Button that looks like the Auspice tree buttons: a tab hanging from the top of the tree card */
export const TreeTabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border: 1px solid ${AUSPICE_BUTTON.border};
  border-top: none;
  border-radius: 0 0 3px 3px;
  background-color: #fff;
  color: ${AUSPICE_BUTTON.color};
  font-family: ${SIDEBAR_THEME['font-family']};
  font-size: 12px;
  font-weight: 400;
  line-height: 15px;
  text-transform: uppercase;
  cursor: pointer;

  /* Auspice button icons are thin outlines. A solid icon in the text color would look much heavier next to them */
  & > svg {
    width: 11px;
    height: 11px;
    color: ${AUSPICE_BUTTON.iconColor};
  }

  &:hover:enabled {
    background-color: #f5f5f5;
  }

  &:disabled {
    color: ${AUSPICE_BUTTON.disabledColor};
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${SIDEBAR_THEME.selectedColor};
    outline-offset: 1px;
  }
`
