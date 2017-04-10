import React, { Component, PropTypes } from 'react'
import themeable from '../../util/themeable'
import { omitProps } from '../../util/passthroughProps'
import CustomPropTypes from '../../util/CustomPropTypes'
import classnames from 'classnames'

import Container from '../Container'
import Heading from '../Heading'

import styles from './styles.css'
import theme from './theme.js'

/**
  A Media component with a caption

  ```jsx_example
  <Media
    description={lorem.sentence()}
  >
    <Avatar isBlock userName="Jennifer Stern" />
  </Media>
  ```
  Create a heading by using the `title` prop, and add space around the Media
  component via the `margin` prop. To constrain the component's width, use
  the `size` prop.

  You can also adjust the alignment of the media with the descriptive text by
  setting the `alignContent` prop.
  ```jsx_example
  <Media
    margin="xLarge auto"
    size="small"
    alignContent="top"
    title="Graham Taylor"
    description={lorem.paragraph()}
  >
    <Avatar isBlock userName="Graham Taylor" />
  </Media>
  ```
**/
@themeable(theme, styles)
class Media extends Component {
  static propTypes = {
    /**
    * the media object
    */
    children: PropTypes.node.isRequired,
    /**
    * the media title
    */
    title: PropTypes.string,
    /**
    * the media description
    */
    description: PropTypes.string,
    /**
    * how should the title and description align
    */
    alignContent: PropTypes.oneOf(['top', 'center']),
    /**
    * Valid values are `0`, `none`, `auto`, `xxxSmall`, `xxSmall`, `xSmall`,
    * `small`, `medium`, `large`, `xLarge`, `xxLarge`. Apply these values via
    * familiar CSS-like shorthand. For example: `margin="small auto large"`.
    */
    margin: CustomPropTypes.spacing,
    size: PropTypes.oneOf(['small', 'medium', 'large'])
  }

  static defaultProps = {
    alignContent: 'center'
  }

  render () {
    const props = omitProps(this.props, Media.propTypes)

    const classes = {
      className: classnames({
        [styles.root]: true,
        [styles[this.props.alignContent]]: true
      })
    }
    return (
      <Container
        {...props}
        {...classes}
        display={null}
        as="figure"
        margin={this.props.margin}
        size={this.props.size}
      >
        <div className={styles.figure}>
          {this.props.children}
        </div>
        <figcaption className={styles.caption}>
          {
            this.props.title && (
              <Heading level="h3">
                <span className={styles.title}>
                  {this.props.title}
                </span>
              </Heading>
            )
          }
          {
            this.props.description && (
              <div className={styles.description}>
                {this.props.description}
              </div>
            )
          }
        </figcaption>
      </Container>
    )
  }
}

export default Media