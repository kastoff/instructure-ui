/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 - present Instructure, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import React, { Children, Component } from 'react'
import PropTypes from 'prop-types'
import keycode from 'keycode'

import Popover, { PopoverTrigger, PopoverContent } from '@instructure/ui-overlays/lib/components/Popover'

import generateElementId from '@instructure/ui-utils/lib/dom/generateElementId'
import CustomPropTypes from '@instructure/ui-utils/lib/react/CustomPropTypes'
import deprecated from '@instructure/ui-utils/lib/react/deprecated'
import LayoutPropTypes from '@instructure/ui-layout/lib/utils/LayoutPropTypes'
import { pickProps } from '@instructure/ui-utils/lib/react/passthroughProps'
import safeCloneElement from '@instructure/ui-utils/lib/react/safeCloneElement'
import warning from '@instructure/ui-utils/lib/warning'
import themeable from '@instructure/ui-themeable'
import matchComponentTypes from '@instructure/ui-utils/lib/react/matchComponentTypes'
import containsActiveElement from '@instructure/ui-utils/lib/dom/containsActiveElement'

import { MenuContextTypes, makeMenuContext, getMenuContext } from '../../utils/MenuContextTypes'
import MenuItem from './MenuItem'

import styles from './styles.css'
import theme from './theme'

/**
---
category: components
---
**/
@deprecated('5.1.0', {
  title: 'label',
  labelledBy: 'aria-labelledby',
  controls: 'aria-controls'
})
@themeable(theme, styles)
class Menu extends Component {
  static propTypes = {
    /**
     * Children of type `MenuItem`, `MenuItemGroup`, `MenuItemSeparator`, or `Menu`
     */
    children: CustomPropTypes.Children.oneOf(['MenuItem', 'MenuItemGroup', 'MenuItemSeparator', 'Menu']),
    /**
     * Description of the `<Menu />`
     */
    label: PropTypes.string,
    /**
     * Is the `<Menu />` disabled
     */
    disabled: PropTypes.bool,
    /**
     * The trigger element, if the `<Menu />` is to render as a popover
     */
    trigger: PropTypes.node,
    /**
     * If a trigger is supplied, where should the `<Menu />` be placed (relative to the trigger)
     */
    placement: LayoutPropTypes.placement,
    /**
     * Should the `<Menu />` be open for the initial render
     */
    defaultShow: PropTypes.bool,
    /**
     * Is the `<Menu />` open (should be accompanied by `onToggle`)
     */
    show: CustomPropTypes.controllable(PropTypes.bool, 'onToggle', 'defaultShow'),
    /**
     * Callback fired when the `<Menu />` is toggled open/closed. When used with `show`,
     * the component will not control its own state.
     */
    onToggle: PropTypes.func,
    /**
     * Callback fired when an item within the `<Menu />` is selected
     */
    onSelect: PropTypes.func,
    /**
     * If a trigger is supplied, callback fired when the `<Menu />` is closed
     */
    onDismiss: PropTypes.func,
    /**
     * If a trigger is supplied, callback fired when the `<Menu />` trigger is blurred
     */
    onBlur: PropTypes.func,
    /**
     * If a trigger is supplied, callback fired when the `<Menu />` trigger is focused
     */
    onFocus: PropTypes.func,
    /**
     * If a trigger is supplied, callback fired onMouseOver for the `<Menu />` trigger
     */
    onMouseOver: PropTypes.func,
    /**
     * Callback fired on the onKeyDown of the `<Menu />`
     */
    onKeyDown: PropTypes.func,
    /**
     * Callback fired on the onKeyUp of the `<Menu />`
     */
    onKeyUp: PropTypes.func,
    /*
     * A function that returns a reference to the `<Menu />`
     */
    menuRef: PropTypes.func,
    /**
     * A function that returns a reference to the `<Popover />`
     */
    popoverRef: PropTypes.func,
    /**
     * If a trigger is supplied, an element or a function returning an element to use as the mount node
     * for the `<Menu />` (defaults to `document.body`)
     */
    mountNode: PropTypes.oneOfType([CustomPropTypes.element, PropTypes.func]),
    /**
     * If a trigger is supplied, an element, function returning an element, or array of elements that will not
     * be hidden from the screen reader when the `<Menu />` is open
     */
    liveRegion: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.element), PropTypes.element, PropTypes.func]),
    /**
     * If a trigger is supplied, should the `<Menu />` hide when an item is selected
     */
    shouldHideOnSelect: PropTypes.bool,
    /**
     * If a trigger is supplied, should the `<Menu />` focus the trigger on after closing
     */
    shouldFocusTriggerOnClose: PropTypes.bool,
    /**
     * The type of `<Menu />`
     */
    type: PropTypes.oneOf(['flyout'])
  }

  static defaultProps = {
    children: null,
    label: null,
    disabled: false,
    trigger: null,
    placement: 'bottom center',
    defaultShow: false,
    onToggle: (shown, menu) => {},
    onSelect: (event, value, selected, item) => {},
    onDismiss: (event, documentClick) => {},
    onBlur: event => {},
    onFocus: event => {},
    onMouseOver: event => {},
    onKeyDown: event => {},
    onKeyUp: event => {},
    menuRef: el => {},
    popoverRef: el => {},
    mountNode: null,
    liveRegion: null,
    shouldHideOnSelect: true,
    shouldFocusTriggerOnClose: true
  }

  state = { hasFocus: false }
  _menuItems = []
  _popover = null
  _trigger = null
  _menu = null
  _labelId = generateElementId('Menu')
  _activeSubMenu = null

  static childContextTypes = MenuContextTypes
  static contextTypes = MenuContextTypes

  getChildContext () {
    // if it's a submenu it will have a context defined by its parent Menu
    const context = getMenuContext(this.context)

    return makeMenuContext({
      registerMenuItem: (item) => {
        const { type } = item.props

        // if the item is a flyout trigger
        // we only want to add it to the parent Menu items list
        if (context && context.registerMenuItem && type === 'flyout') {
          context.registerMenuItem(item)
        } else if (this.getMenuItemIndex(item) < 0) {
          this._menuItems.push(item)
        }
      },
      removeMenuItem: (item) => {
        const { type } = item.props
        // if the item is a flyout trigger
        // we only want to remove it from the parent Menu items list
        if (context && context.removeMenuItem && type === 'flyout') {
          context.removeMenuItem(item)
        } else {
          const index = this.getMenuItemIndex(item)
          warning(index >= 0, '[Menu] Could not find registered menu item.')
          if (index >= 0) {
            this._menuItems.splice(index, 1)
          }
        }
      }
    })
  }

  get menuItems () {
    return this._menuItems
  }

  getMenuItemIndex = (item) => {
    return this._menuItems.findIndex(i => i === item)
  }

  handleTriggerKeyDown = (event) => {
    if (this.props.type === 'flyout' && event.keyCode === keycode.codes.right) {
      event.persist()
      this.show()
    }
  }

  handleTriggerMouseOver = () => {
    if (this.props.type === 'flyout') {
      this.show()
    }
  }

  handleToggle = (shown) => {
    if (typeof this.props.onToggle === 'function') {
      this.props.onToggle(shown, this)
    }
  }

  handleMenuFocus = () => {
    // when there is only one menu item, focus that item so SR users
    // don't have to drill down for access
    if (this.menuItems.length === 1) {
      this.menuItems[0].focus && this.menuItems[0].focus()
    }
  }

  handleMenuKeyDown = (event) => {
    const key = event && event.keyCode
    const {
      down,
      up,
      pgup,
      pgdn,
      tab,
      left
    } = keycode.codes

    if (key === down || key === pgdn) {
      event.preventDefault()
      this.moveFocus(1)
      this.hideActiveSubMenu(event)
    } else if (key === up || key === pgup) {
      event.preventDefault()
      this.moveFocus(-1)
      this.hideActiveSubMenu(event)
    } else if (key === tab || key === left) {
      event.persist()
      this.hide(event)
    }

    if (typeof this.props.onKeyDown === 'function') {
      this.props.onKeyDown(event)
    }
  }

  handleMenuItemSelect = (event, value, selected, item) => {
    if (this.props.shouldHideOnSelect) {
      this.hide(event)
    }

    if (typeof this.props.onSelect === 'function') {
      this.props.onSelect(event, value, selected, item)
    }
  }

  handleMenuItemFocus = () => {
    this.setState({ hasFocus: true })
  }

  handleMenuItemBlur = () => {
    this.setState({ hasFocus: this.focusedIndex >= 0 })
  }

  handleMenuItemMouseOver = (event, menuItem) => {
    if (this._activeSubMenu && menuItem !== this._activeSubMenu._trigger) {
      this.hideActiveSubMenu(event)
    }
  }

  hideActiveSubMenu = (event) => {
    if (this._activeSubMenu) {
      this._activeSubMenu.hide(event)
      this._activeSubMenu = null
    }
  }

  handleSubMenuToggle = (shown, subMenu) => {
    if (shown) {
      this._activeSubMenu = subMenu
    }
  }

  handleSubMenuDismiss = (event, documentClick) => {
    if ((event && event.keyCode === keycode.codes.tab) || documentClick) {
      this.hide(event)
    }
  }

  hide = (event) => {
    if (this._popover) {
      this._popover.hide(event)
    }
  }

  show = (event) => {
    if (this._popover) {
      this._popover.show(event)
    }
  }

  focus () {
    if (this.shown) {
      warning(this._menu && this._menu.focus, '[Menu] Could not focus the menu.')
      this._menu.focus()
    } else {
      warning(this._trigger && this._trigger.focus, '[Menu] Could not focus the trigger.')
      this._trigger.focus()
    }
  }

  focused () {
    if (this.shown) {
      return containsActiveElement(this._menu) || this.state.hasFocus
    } else {
      return containsActiveElement(this._trigger)
    }
  }

  get focusedIndex () {
    return this.menuItems.findIndex((item) => {
      return (item && item.focused === true)
    })
  }

  moveFocus (step) {
    const count = this.menuItems ? this.menuItems.length : 0

    if (count <= 0) {
      return
    }

    const current = (this.focusedIndex < 0 && step < 0) ? 0 : this.focusedIndex

    const nextItem = this.menuItems[(current + count + step) % count]

    warning(nextItem && nextItem.focus, '[Menu] Could not focus next menu item.')

    nextItem.focus()
  }

  get shown () {
    return this._popover ? this._popover.shown : true
  }

  renderChildren () {
    const {
      children,
      disabled
    } = this.props

    let count = 0

    return Children.map(children, (child) => {
      if (!matchComponentTypes(child, ['MenuItemSeparator', 'MenuItem', 'MenuItemFlyout', 'MenuItemGroup', 'Menu'])) {
        return
      }

      count += 1

      const isTabbable = !this.state.hasFocus && count === 1

      if (matchComponentTypes(child, ['MenuItemSeparator'])) {
        return child
      }

      const controls = (
        child.props['aria-controls'] ||
        child.props.controls ||
        this.props['aria-controls'] || // eslint-disable-line react/prop-types
        this.props.controls // eslint-disable-line react/prop-types
      )

      if (matchComponentTypes(child, ['MenuItem'])) {
        return (
          <li>
            {safeCloneElement(child, {
              controls,
              disabled: (disabled || child.props.disabled),
              onFocus: this.handleMenuItemFocus,
              onBlur: this.handleMenuItemBlur,
              onSelect: this.handleMenuItemSelect,
              onMouseOver: this.handleMenuItemMouseOver,
              tabIndex: isTabbable ? 0 : -1
            })}
          </li>
        )
      }

      if (matchComponentTypes(child, ['MenuItemGroup'])) {
        return (
          <li>
            {safeCloneElement(child, {
              controls,
              disabled: (disabled || child.props.disabled),
              onFocus: this.handleMenuItemFocus,
              onBlur: this.handleMenuItemBlur,
              onSelect: this.handleMenuItemSelect,
              onMouseOver: this.handleMenuItemMouseOver,
              isTabbable
            })}
          </li>
        )
      }

      if (matchComponentTypes(child, ['Menu', 'MenuItemFlyout'])) {
        const submenuDisabled = disabled || child.props.disabled

        return (
          <li>
            {safeCloneElement(child, {
              type: 'flyout',
              controls,
              disabled: submenuDisabled,
              onSelect: this.handleMenuItemSelect,
              placement: 'end top',
              offsetX: -5,
              offsetY: 5,
              withArrow: false,
              onToggle: this.handleSubMenuToggle,
              onDismiss: this.handleSubMenuDismiss,
              trigger: (
                <MenuItem
                  onMouseOver={this.handleMenuItemMouseOver}
                  onFocus={this.handleMenuItemFocus}
                  onBlur={this.handleMenuItemBlur}
                  tabIndex={isTabbable ? 0 : -1}
                  type="flyout"
                  disabled={submenuDisabled}
                >
                  {child.props.title || child.props.label}
                </MenuItem>
              )
            })}
          </li>
        )
      }
    })
  }

  renderMenu () {
    const {
      menuRef,
      disabled,
      label,
      trigger,
      onKeyUp,
      title,  // eslint-disable-line react/prop-types
      contentRef // eslint-disable-line react/prop-types
    } = this.props

    const labelledBy = this.props['aria-labelledby'] || this.props.labelledBy // eslint-disable-line react/prop-types
    const controls = this.props['aria-controls'] || this.props.controls // eslint-disable-line react/prop-types

    return (
      <ul
        role="menu"
        title={title || label}
        tabIndex={this.state.hasFocus ? null : '0'}
        className={styles.menu}
        aria-labelledby={labelledBy || (trigger && this._labelId)}
        aria-controls={controls}
        aria-disabled={disabled ? 'true' : null}
        onKeyDown={this.handleMenuKeyDown}
        onKeyUp={onKeyUp}
        onFocus={this.handleMenuFocus}
        ref={(el) => {
          this._menu = el
          if (typeof menuRef === 'function') {
            menuRef(el)
          }
          if (typeof contentRef === 'function') {
            contentRef(el)
          }
        }}
      >
        {this.renderChildren()}
      </ul>
    )
  }

  render () {
    const {
      trigger,
      disabled
    } = this.props

    return trigger ? (
      <Popover
        {...pickProps(this.props, Popover.propTypes)}
        on={['click']}
        shouldContainFocus
        shouldReturnFocus
        onToggle={this.handleToggle}
        ref={(el) => {
          this._popover = el
          if (typeof this.props.popoverRef === 'function') {
            this.props.popoverRef(el)
          }
        }}
      >
        <PopoverTrigger>
          {safeCloneElement(trigger, {
            role: 'button',
            ref: (el) => {
              this._trigger = el
            },
            'aria-haspopup': true,
            'aria-expanded': this.shown ? 'true' : 'false',
            id: this._labelId,
            onMouseOver: this.handleTriggerMouseOver,
            onKeyDown: this.handleTriggerKeyDown,
            disabled: trigger.props.disabled || disabled
          })}
        </PopoverTrigger>
        <PopoverContent>
          {this.renderMenu()}
        </PopoverContent>
      </Popover>
    ) : this.renderMenu()
  }
}

export default Menu

@deprecated('5.1.0', {
  title: 'label',
  contentRef: 'menuRef',
  controls: 'aria-controls',
  labelledBy: 'aria-labelledby'
})
@deprecated('5.1.0', null, '[Menu] children of type [MenuItemFlyout] should be replaced with [Menu].')
export class MenuItemFlyout extends Menu {
  static displayName = 'MenuItemFlyout'
}

export { default as MenuItem } from './MenuItem'
export { default as MenuItemGroup } from './MenuItemGroup'
export { default as MenuItemSeparator } from './MenuItemSeparator'
