import React from 'react';
import { BackendConsumer } from '../connectors/Data';
import { MenuItem, Button } from '@blueprintjs/core';
import { MultiSelect } from '@blueprintjs/select';
import MultiSelectDropdown from './MultiSelectDropdown';

class TaskStatusFilterDropdown extends MultiSelectDropdown {
  
  renderTag(item) {
    return item
  }

  getItemKey(item) {
    return item;
  }

  getItemText(item) {
    return item;
  }

  getPlaceholderText() {
    return "Filter by Status..."
  }

  async setSelectedItem(item) {
    const { backend } = this.props;
    const { setTaskStatusFilter } = backend.actions;

    return setTaskStatusFilter(item);
  }

  async unsetSelectedItem(item) {
    const { backend } = this.props;
    const { unsetTaskStatusFilter } = backend.actions;

    return unsetTaskStatusFilter(item);
  }

  async clearSelectedItems() {
    const { backend } = this.props;
    const { clearTaskStatusFilter } = backend.actions;
    return clearTaskStatusFilter();
  }

  getAllItems() {
    const { backend } = this.props;
    const { getAllTaskStatuses } = backend.actions;
    return getAllTaskStatuses();
  }

  getSelectedItems() {
    const { backend } = this.props;
    const { getTaskStatusFilters } = backend.actions;
    return getTaskStatusFilters();
  }


}

export default function TaskStatusFilter(props) {
  return (<BackendConsumer>
    { (backend) => (<TaskStatusFilterDropdown backend={backend} {...props} />)}
  </BackendConsumer>)
}