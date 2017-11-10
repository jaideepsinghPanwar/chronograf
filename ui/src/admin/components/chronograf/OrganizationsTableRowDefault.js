import React, {PropTypes, Component} from 'react'

import Dropdown from 'shared/components/Dropdown'

import {USER_ROLES} from 'src/admin/constants/dummyUsers'

// This is a non-editable organization row, used currently for DEFAULT_ORG
class OrganizationsTableRowDefault extends Component {
  handleChooseDefaultRole = role => {
    const {organization, onChooseDefaultRole} = this.props
    onChooseDefaultRole(organization, role.name)
  }

  render() {
    const {organization} = this.props

    const dropdownRolesItems = USER_ROLES.map(role => ({
      ...role,
      text: role.name,
    }))

    return (
      <div className="orgs-table--org">
        <div className="orgs-table--id">
          {organization.id}
        </div>
        <div className="orgs-table--name-disabled">
          {organization.name}
        </div>
        <div className="orgs-table--default-role">
          <Dropdown
            items={dropdownRolesItems}
            onChoose={this.handleChooseDefaultRole}
            selected={organization.defaultRole}
            className="dropdown-stretch"
          />
        </div>
        <button
          className="btn btn-sm btn-default btn-square orgs-table--delete"
          disabled={true}
        >
          <span className="icon trash" />
        </button>
      </div>
    )
  }
}

const {func, shape, string} = PropTypes

OrganizationsTableRowDefault.propTypes = {
  organization: shape({
    id: string,
    name: string.isRequired,
  }).isRequired,
  onChooseDefaultRole: func.isRequired,
}

export default OrganizationsTableRowDefault