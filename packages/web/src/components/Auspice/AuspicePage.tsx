// import React from 'react'
//
// // import { connect } from 'react-redux'
// // import { State } from 'state/reducer'
//
// import AuspiceMain from 'auspice/src/components/main/index'
//
// // export interface Props {
// //   foo: boolean
// // }
// //
// // const mapStateToProps = (state: State) => ({ foo: state.ui.filterPanelCollapsed })
// //
// // @connect(mapStateToProps)
// // class AuspicePage extends React.Component<Props> {
// //   public constructor(props: Props) {
// //     super(props)
// //   }
// //
// //   render() {
// //     console.log({ foo: this.props.foo })
// //     return null
// //   }
// // }
//
// function AuspicePage() {
//   return <AuspiceMain />
// }
//
// export { AuspicePage }

import React from 'react'
// import PropTypes from 'prop-types'
// import NoSSR from 'react-no-ssr'
import { ThemeProvider } from 'styled-components'
import SidebarToggle from 'auspice/src/components/framework/sidebar-toggle'
// import { controlsHiddenWidth } from 'auspice/src/util/globals'
import DownloadModal from 'auspice/src/components/download/downloadModal'
// import { analyticsNewPage } from 'auspice/src/util/googleAnalytics'
// import handleFilesDropped from 'auspice/src/actions/filesDropped'
import { TOGGLE_SIDEBAR } from 'auspice/src/actions/types'
import AnimationController from 'auspice/src/components/framework/animationController'
import { Sidebar } from 'auspice/src/components/main/sidebar'
import { calcPanelDims, calcStyles } from 'auspice/src/components/main/utils'
import { PanelsContainer, sidebarTheme } from 'auspice/src/components/main/styles'
import ErrorBoundary from 'auspice/src/util/errorBoundry'
import Tree from 'auspice/src/components/tree'

// import Spinner from 'auspice/src/components/framework/spinner'
// import MobileNarrativeDisplay from 'auspice/src/components/narrative/MobileNarrativeDisplay'

// const Entropy = lazy(() => import('auspice/src/components/entropy'))
// const Frequencies = lazy(() => import('auspice/src/components/frequencies'))

// NOTE: Disable server-side rendering for Tree component.
// Some of the subcomponents there rely on `document` global to be present, however it is not available during server rendering.
// import dynamic from 'next/dynamic'
// const Tree = dynamic(() => import('auspice/src/components/tree'), { ssr: false })

// @connect((state) => ({
//   panelsToDisplay: state.controls.panelsToDisplay,
//   panelLayout: state.controls.panelLayout,
//   displayNarrative: state.narrative.display,
//   narrativeIsLoaded: state.narrative.loaded,
//   narrativeTitle: state.narrative.title,
//   browserDimensions: state.browserDimensions.browserDimensions,
//   frequenciesLoaded: state.frequencies.loaded,
//   metadataLoaded: state.metadata.loaded,
//   treeLoaded: state.tree.loaded,
//   sidebarOpen: state.controls.sidebarOpen,
//   showOnlyPanels: state.controls.showOnlyPanels
// }))
class Main extends React.Component {
  constructor(props) {
    super(props)
    // /* window listner employed to toggle switch to mobile display.
    // NOTE: this used to toggle sidebar open boolean when that was stored
    // as state here, but his has since ben moved to redux state. The mobile
    // display should likewise be lifted to redux state */
    // const mql = window.matchMedia(`(min-width: ${controlsHiddenWidth}px)`)
    // mql.addListener(() =>
    //   this.setState({
    //     mobileDisplay: !this.state.mql.matches,
    //   }),
    // )
    // this.state = {
    //   mql,
    //   mobileDisplay: !mql.matches,
    //   showSpinner: !(this.props.metadataLoaded && this.props.treeLoaded),
    // }
    // analyticsNewPage()
    this.toggleSidebar = this.toggleSidebar.bind(this)
  }

  // static propTypes = {
  //   dispatch: PropTypes.func.isRequired,
  // }

  // componentWillReceiveProps(nextProps) {
  //   if (this.state.showSpinner && nextProps.metadataLoaded && nextProps.treeLoaded) {
  //     this.setState({ showSpinner: false })
  //   }
  // }

  // componentDidMount() {
  //   document.addEventListener(
  //     'dragover',
  //     (e) => {
  //       e.preventDefault()
  //     },
  //     false,
  //   )
  //   document.addEventListener(
  //     'drop',
  //     (e) => {
  //       e.preventDefault()
  //       return this.props.dispatch(handleFilesDropped(e.dataTransfer.files))
  //     },
  //     false,
  //   )
  // }

  toggleSidebar() {
    this.props.dispatch({ type: TOGGLE_SIDEBAR, value: !this.props.sidebarOpen })
  }

  shouldShowMapLegend() {
    const showingTree = this.props.panelsToDisplay.includes('tree')
    const inGrid = this.props.panelLayout !== 'grid'

    return !showingTree || inGrid
  }

  render() {
    // if (this.state.showSpinner) {
    //   return <Spinner />
    // }

    /* for mobile narratives we use a custom component as the nesting of view components is different */
    /* TODO - the breakpoint for `mobileDisplay` needs testing */
    const {
      panelsToDisplay,
      displayNarrative,
      dispatch,
      browserDimensions,
      narrativeTitle,
      panelLayout,
      sidebarOpen,
    } = this.props

    // if (this.state.mobileDisplay && displayNarrative) {
    //   return (
    //     <>
    //       <AnimationController />
    //       <ThemeProvider theme={sidebarTheme}>
    //         <MobileNarrativeDisplay />
    //       </ThemeProvider>
    //     </>
    //   )
    // }

    /* The following code is employed for:
     * (a) all non-narrative displays (including on mobile)
     * (b) narrative display for non-mobile (i.e. display side-by-side)
     */
    const { availableWidth, availableHeight, sidebarWidth, overlayStyles } = calcStyles(
      browserDimensions,
      displayNarrative,
      sidebarOpen,
      // this.state.mobileDisplay,
    )

    // const overlayHandler = () => {
    //   dispatch({ type: TOGGLE_SIDEBAR, value: false })
    // }

    const { big, chart } = calcPanelDims(
      panelLayout === 'grid',
      panelsToDisplay,
      displayNarrative,
      availableWidth,
      availableHeight,
    )

    return (
      <span>
        {/* <AnimationController /> */}
        {/* <ErrorBoundary showNothing> */}
        {/*  <ThemeProvider theme={sidebarTheme}> */}
        {/*    <DownloadModal /> */}
        {/*  </ThemeProvider> */}
        {/* </ErrorBoundary> */}
        {/* <SidebarToggle */}
        {/*  sidebarOpen={sidebarOpen} */}
        {/*  // mobileDisplay={this.state.mobileDisplay} */}
        {/*  handler={this.toggleSidebar} */}
        {/* /> */}
        {/* <Sidebar */}
        {/*  sidebarOpen={sidebarOpen} */}
        {/*  width={sidebarWidth} */}
        {/*  height={availableHeight} */}
        {/*  displayNarrative={displayNarrative} */}
        {/*  panelsToDisplay={panelsToDisplay} */}
        {/*  narrativeTitle={narrativeTitle} */}
        {/*  // mobileDisplay={this.state.mobileDisplay} */}
        {/*  navBarHandler={this.toggleSidebar} */}
        {/* /> */}
        <PanelsContainer width={availableWidth} height={availableHeight} left={sidebarOpen ? sidebarWidth : 0}>
          {/* {this.props.narrativeIsLoaded && !this.props.panelsToDisplay.includes('EXPERIMENTAL_MainDisplayMarkdown') */}
          {/*  ? renderNarrativeToggle(this.props.dispatch, this.props.displayNarrative) */}
          {/*  : null} */}

          {/* {this.props.displayNarrative || this.props.showOnlyPanels ? null : ( */}
          {/*  <Info width={calcUsableWidth(availableWidth, 1)} /> */}
          {/* )} */}

          <Tree width={big.width} height={big.height} />

          {/* {this.props.panelsToDisplay.includes('tree') ? <Tree width={big.width} height={big.height} /> : null} */}

          {/* {this.props.panelsToDisplay.includes('map') ? ( */}
          {/*  <Map */}
          {/*    width={big.width} */}
          {/*    height={big.height} */}
          {/*    justGotNewDatasetRenderNewMap={false} */}
          {/*    legend={this.shouldShowMapLegend()} */}
          {/*  /> */}
          {/* ) : null} */}

          {/* {this.props.panelsToDisplay.includes('entropy') ? ( */}
          {/*  <Suspense fallback={null}> */}
          {/*    <Entropy width={chart.width} height={chart.height} /> */}
          {/*  </Suspense> */}
          {/* ) : null} */}

          {/* {this.props.panelsToDisplay.includes('frequencies') && this.props.frequenciesLoaded ? ( */}
          {/*  <Suspense fallback={null}> */}
          {/*    <Frequencies width={chart.width} height={chart.height} /> */}
          {/*  </Suspense> */}
          {/* ) : null} */}

          {/* {this.props.displayNarrative || this.props.showOnlyPanels ? null : ( */}
          {/*  <Footer width={calcUsableWidth(availableWidth, 1)} /> */}
          {/* )} */}

          {/* {this.props.displayNarrative && this.props.panelsToDisplay.includes('EXPERIMENTAL_MainDisplayMarkdown') ? ( */}
          {/*  <MainDisplayMarkdown width={calcUsableWidth(availableWidth, 1)} /> */}
          {/* ) : null} */}
        </PanelsContainer>

        {/* /!* overlay (used for mobile to open / close sidebar) *!/ */}
        {/* {this.state.mobileDisplay ? ( */}
        {/*  <div style={overlayStyles} onClick={overlayHandler} onTouchStart={overlayHandler} /> */}
        {/* ) : null} */}
      </span>
    )
  }
}

export default function AuspicePage() {
  return (
    // <NoSSR>
    <Main browserDimensions={{ width: 800, height: 600 }} />
    // </NoSSR>
  )
}

// export { AuspicePage }
