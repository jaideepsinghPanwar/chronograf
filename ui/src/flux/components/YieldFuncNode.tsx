import React, {PureComponent} from 'react'
import _ from 'lodash'

import {ErrorHandling} from '../../shared/decorators/errors'

import {FluxTable} from 'src/types'
import {Func} from 'src/types/flux'
import TimeMachineVis from './TimeMachineVis'

interface Props {
  data: FluxTable[]
  index: number
  bodyID: string
  func: Func
  declarationID?: string
}

@ErrorHandling
class YieldFuncNode extends PureComponent<Props> {
  public render() {
    const {data, func} = this.props
    const yieldName = _.get(func, 'args.0.value', 'result')
    return (
      <div className="yield-node">
        <div className="func-node--connector" />
        <TimeMachineVis data={data} yieldName={yieldName} />
      </div>
    )
  }
}

export default YieldFuncNode
