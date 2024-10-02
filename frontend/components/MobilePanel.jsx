import React, { Component } from 'react'
import { AbsoluteCenter } from '@chakra-ui/react'

export default class MobilePanel extends Component {

  render() {
    return (
      <>
        <AbsoluteCenter color="white">Sorry. Mobile device is not supported. Try to use this site on your desktop.</AbsoluteCenter>
      </>
    )
  }
}
