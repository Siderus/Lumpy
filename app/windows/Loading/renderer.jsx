import React from 'react'
import ReactDom from 'react-dom'
import { shell, ipcRenderer } from 'electron'
import styled from 'styled-components'

import 'react-photonkit'
import ProgressBar from '../../components/ProgressBar'
import OrionLogo from '../../../docs/logo.svg'
import SiderusLogo from '../../../docs/siderus-logo.svg'

const Window = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
`
const Orion = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
`
const Progress = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`
const SiderusLink = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  margin: 10px 24px;

  display: flex;
  align-items: center;
  svg {
    margin-left: 5px;
  }
  &, svg, path, g {
    cursor: pointer;
  }
`

class LoadingWindow extends React.Component {
  state = {
    text: 'Loading',
    percentage: 0
  }

  componentWillMount () {
    ipcRenderer.on('set-progress', (event, data) => this.setState(data))
  }

  componentWillUnmount () {
    ipcRenderer.removeAllListeners('set-progress')
  }

  render () {
    return (
      <Window>
        <Orion>
          <OrionLogo width='150px' />
          Siderus Orion
        </Orion>

        <Progress>
          {this.state.text}
          <ProgressBar percentage={this.state.percentage} />
        </Progress>

        <SiderusLink onClick={event => shell.openExternal('https://siderus.io')}>
          Developed by <SiderusLogo width='30px' height='30px' />
        </SiderusLink>
      </Window>
    )
  }
}

ReactDom.render(<LoadingWindow />, document.querySelector('#host'))
