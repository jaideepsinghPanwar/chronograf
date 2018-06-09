import React, {Component, ReactNode} from 'react'
import DygraphClass from 'dygraphs'
import {connect} from 'react-redux'
import _ from 'lodash'
import NanoDate from 'nano-date'
import ReactResizeDetector from 'react-resize-detector'
import {getDeep} from 'src/utils/wrappers'

import Dygraphs from 'src/external/dygraph'
import DygraphLegend from 'src/shared/components/DygraphLegend'
import StaticLegend from 'src/shared/components/StaticLegend'
import Annotations from 'src/shared/components/Annotations'
import Crosshair from 'src/shared/components/Crosshair'

import getRange, {getStackedRange} from 'src/shared/parsing/getRangeForDygraph'
import {
  AXES_SCALE_OPTIONS,
  DEFAULT_AXIS,
} from 'src/dashboards/constants/cellEditor'
import {buildDefaultYLabel} from 'src/shared/presenters'
import {numberValueFormatter} from 'src/utils/formatting'
import {NULL_HOVER_TIME} from 'src/shared/constants/tableGraph'
import {
  OPTIONS,
  LINE_COLORS,
  LABEL_WIDTH,
  CHAR_PIXELS,
  barPlotter,
} from 'src/shared/graphs/helpers'
import {ErrorHandling} from 'src/shared/decorators/errors'

import {getLineColorsHexes} from 'src/shared/constants/graphColorPalettes'
const {LOG, BASE_10, BASE_2} = AXES_SCALE_OPTIONS

import {
  DygraphAxis,
  Axes,
  Query,
  RuleValues,
  TimeRange,
  DygraphSeries,
} from 'src/types'

type DygraphData = number[][]

interface Props {
  cellID: string
  queries: Query[]
  timeSeries: DygraphData
  labels: string[]
  options: {[x: string]: any} // TODO
  containerStyle: object // TODO
  dygraphSeries: DygraphSeries
  timeRange: TimeRange
  colors: object
  handleSetHoverTime: (t: string) => void
  ruleValues?: RuleValues
  axes?: Axes
  isGraphFilled?: boolean
  isBarGraph?: boolean
  staticLegend?: boolean
  setResolution?: (w: number) => void
  dygraphRef?: () => void
  onZoom?: (u: number, l: number) => void
  mode?: string
  children?: ReactNode
}

interface State {
  staticLegendHeight: null | number
  isMounted: boolean
}

@ErrorHandling
class Dygraph extends Component<Props, State> {
  public static defaultProps: Partial<Props> = {
    axes: {
      x: {
        bounds: [null, null],
        ...DEFAULT_AXIS,
      },
      y: {
        bounds: [null, null],
        ...DEFAULT_AXIS,
      },
      y2: {
        bounds: undefined,
        ...DEFAULT_AXIS,
      },
    },
    containerStyle: {},
    isGraphFilled: true,
    dygraphRef: () => {},
    onZoom: () => {},
    handleSetHoverTime: () => {},
    staticLegend: false,
    setResolution: () => {},
  }

  private graphRef: HTMLDivElement
  private dygraph: DygraphClass

  constructor(props: Props) {
    super(props)
    this.state = {
      staticLegendHeight: null,
      isMounted: false,
    }
  }

  public componentDidMount() {
    const {
      axes: {y, y2},
      isGraphFilled: fillGraph,
      isBarGraph,
      options,
      labels,
    } = this.props

    const timeSeries = this.timeSeries
    const graphRef = this.graphRef

    let defaultOptions = {
      ...options,
      labels,
      fillGraph,
      file: this.timeSeries,
      ylabel: this.getLabel('y'),
      logscale: y.scale === LOG,
      colors: LINE_COLORS,
      series: this.colorDygraphSeries,
      axes: {
        y: {
          valueRange: this.getYRange(timeSeries),
          axisLabelFormatter: (
            yval: number,
            __,
            opts: (name: string) => number
          ) => numberValueFormatter(yval, opts, y.prefix, y.suffix),
          axisLabelWidth: this.labelWidth,
          labelsKMB: y.base === BASE_10,
          labelsKMG2: y.base === BASE_2,
        },
        y2: {
          valueRange: getRange(timeSeries, y2.bounds),
        },
      },
      zoomCallback: (lower: number, upper: number) =>
        this.handleZoom(lower, upper),
      highlightCircleSize: 0,
    }

    if (isBarGraph) {
      defaultOptions = {
        ...defaultOptions,
        plotter: barPlotter,
      }
    }

    this.dygraph = new Dygraphs(graphRef, timeSeries, {
      ...defaultOptions,
      ...OPTIONS,
      ...options,
    })

    const {w} = this.dygraph.getArea()
    this.props.setResolution(w)
    this.setState({isMounted: true})
  }

  public componentWillUnmount() {
    this.dygraph.destroy()
    delete this.dygraph
  }

  public shouldComponentUpdate(nextProps: Props, nextState: State) {
    const arePropsEqual = _.isEqual(this.props, nextProps)
    const areStatesEqual = _.isEqual(this.state, nextState)
    return !arePropsEqual || !areStatesEqual
  }

  public componentDidUpdate(prevProps: Props) {
    const {
      labels,
      axes: {y, y2},
      options,
      isBarGraph,
    } = this.props

    const dygraph = this.dygraph

    if (!dygraph) {
      throw new Error(
        'Dygraph not configured in time; this should not be possible!'
      )
    }

    const timeSeries = this.timeSeries

    const timeRangeChanged = !_.isEqual(
      prevProps.timeRange,
      this.props.timeRange
    )

    if (this.dygraph.isZoomed() && timeRangeChanged) {
      this.dygraph.resetZoom()
    }

    const updateOptions = {
      ...options,
      labels,
      file: timeSeries,
      logscale: y.scale === LOG,
      ylabel: this.getLabel('y'),
      axes: {
        y: {
          valueRange: this.getYRange(timeSeries),
          axisLabelFormatter: (
            yval: number,
            __,
            opts: (name: string) => number
          ) => numberValueFormatter(yval, opts, y.prefix, y.suffix),
          axisLabelWidth: this.labelWidth,
          labelsKMB: y.base === BASE_10,
          labelsKMG2: y.base === BASE_2,
        },
        y2: {
          valueRange: getRange(timeSeries, y2.bounds),
        },
      },
      colors: LINE_COLORS,
      series: this.colorDygraphSeries,
      plotter: isBarGraph ? barPlotter : null,
    }

    dygraph.updateOptions(updateOptions)

    const {w} = this.dygraph.getArea()
    this.props.setResolution(w)
    this.resize()
  }

  public render() {
    const {staticLegendHeight} = this.state
    const {staticLegend, children, cellID} = this.props
    const nestedGraph = (children && children.length && children[0]) || children
    let dygraphStyle = {...this.props.containerStyle, zIndex: '2'}
    if (staticLegend) {
      const cellVerticalPadding = 16

      dygraphStyle = {
        ...this.props.containerStyle,
        zIndex: '2',
        height: `calc(100% - ${staticLegendHeight + cellVerticalPadding}px)`,
      }
    }

    return (
      <div className="dygraph-child">
        {this.dygraph && (
          <div className="dygraph-addons">
            {this.areAnnotationsVisible && (
              <Annotations
                dygraph={this.dygraph}
                dWidth={this.dygraph.width_}
                staticLegendHeight={staticLegendHeight}
              />
            )}
            <DygraphLegend
              cellID={cellID}
              dygraph={this.dygraph}
              onHide={this.handleHideLegend}
              onShow={this.handleShowLegend}
            />
            <Crosshair
              dygraph={this.dygraph}
              staticLegendHeight={staticLegendHeight}
            />
          </div>
        )}
        <div
          onMouseEnter={this.handleShowLegend}
          ref={r => {
            this.graphRef = r
            this.props.dygraphRef(r)
          }}
          className="dygraph-child-container"
          style={dygraphStyle}
        />
        {staticLegend && (
          <StaticLegend
            dygraphSeries={this.colorDygraphSeries}
            dygraph={this.dygraph}
            handleReceiveStaticLegendHeight={
              this.handleReceiveStaticLegendHeight
            }
          />
        )}
        {nestedGraph && React.cloneElement(nestedGraph, {staticLegendHeight})}
        <ReactResizeDetector
          handleWidth={true}
          handleHeight={true}
          onResize={this.resize}
        />
      </div>
    )
  }

  private getYRange = (timeSeries: DygraphData): [number, number] => {
    const {
      options,
      axes: {y},
      ruleValues,
    } = this.props

    if (options.stackedGraph) {
      return getStackedRange(y.bounds)
    }

    const range = getRange(timeSeries, y.bounds, ruleValues)
    const [min, max] = range

    // Bug in Dygraph calculates a negative range for logscale when min range is 0
    if (y.scale === LOG && timeSeries.length === 1 && min <= 0) {
      return [0.1, max]
    }

    return range
  }

  private handleZoom = (lower: number, upper: number) => {
    const {onZoom} = this.props

    if (this.dygraph.isZoomed() === false) {
      return onZoom(null, null)
    }

    onZoom(this.formatTimeRange(lower), this.formatTimeRange(upper))
  }

  private eventToTimestamp = ({pageX: pxBetweenMouseAndPage}: MouseEvent) => {
    const {left: pxBetweenGraphAndPage} = this.graphRef.getBoundingClientRect()
    const graphXCoordinate = pxBetweenMouseAndPage - pxBetweenGraphAndPage
    const timestamp = this.dygraph.toDataXCoord(graphXCoordinate)
    const [xRangeStart] = this.dygraph.xAxisRange()
    const clamped = Math.max(xRangeStart, timestamp)
    return `${clamped}`
  }

  private handleHideLegend = () => {
    this.props.handleSetHoverTime(NULL_HOVER_TIME)
  }

  private handleShowLegend = (e: MouseEvent) => {
    const newTime = this.eventToTimestamp(e)
    this.props.handleSetHoverTime(newTime)
  }

  private get labelWidth() {
    const {
      axes: {y},
    } = this.props

    return (
      LABEL_WIDTH +
      y.prefix.length * CHAR_PIXELS +
      y.suffix.length * CHAR_PIXELS
    )
  }

  private get timeSeries() {
    const {timeSeries} = this.props
    // Avoid 'Can't plot empty data set' errors by falling back to a
    // default dataset that's valid for Dygraph.
    return timeSeries.length ? timeSeries : [[0]]
  }

  private get colorDygraphSeries() {
    const {dygraphSeries, colors} = this.props
    const numSeries = Object.keys(dygraphSeries).length
    const dygraphSeriesKeys = Object.keys(dygraphSeries).sort()
    const lineColors = getLineColorsHexes(colors, numSeries)

    const coloredDygraphSeries = {}
    for (const seriesName in dygraphSeries) {
      if (dygraphSeries.hasOwnProperty(seriesName)) {
        const series = dygraphSeries[seriesName]
        const color = lineColors[dygraphSeriesKeys.indexOf(seriesName)]
        coloredDygraphSeries[seriesName] = {...series, color}
      }
    }
    return coloredDygraphSeries
  }

  private getLabel = (axis: string): string => {
    const {axes, queries} = this.props
    const label = getDeep<string>(axes, `${axis}.label`, '')
    const queryConfig = _.get(queries, ['0', 'queryConfig'], false)

    if (label || !queryConfig) {
      return label
    }

    return buildDefaultYLabel(queryConfig)
  }

  private resize = () => {
    this.dygraph.resizeElements_()
    this.dygraph.predraw_()
    this.dygraph.resize()
  }

  private formatTimeRange = (date: number): string => {
    if (!date) {
      return ''
    }
    const nanoDate = new NanoDate(date)
    return nanoDate.toISOString()
  }

  private handleReceiveStaticLegendHeight = (staticLegendHeight: number) => {
    this.setState({staticLegendHeight})
  }

  private get areAnnotationsVisible() {
    if (!this.dygraph) {
      return false
    }

    const [start, end] = this.dygraph && this.dygraph.xAxisRange()
    return !!start && !!end
  }
}

const mapStateToProps = ({annotations: {mode}}) => ({
  mode,
})

export default connect(mapStateToProps, null)(Dygraph)
