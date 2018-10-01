import axios from 'axios';
import { 
  ConnectorError,
  LoginError,
  ReadError,
  UpdateError,
  CreateError,
  DeleteError,
  InvalidOperation
} from "./Data";

const dateTimeFormat = "YYYY-MM-DD hh:mm:ss";
const dateFormat = "YYYY-MM-DD";
const allDateFormats = [dateTimeFormat, dateFormat];
const TimesheetDetailsFields = ["name", "idx", "project", "task", "from_time", "to_time", "parent", "hours"]
const TimesheetFields = ["name", "status", "creation", "employee", "docstatus", "start_date", "total_hours", "note"];
const TaskFields = ["name", "subject", "description", "progress", "exp_start_date", "priority", "description", "status", "is_group", "project", "actual_time", "_assign", "is_milestone", "_comments", "_user_tags", "depends_on_tasks", "expected_time", "exp_end_date"];
const ProjectFields = ["name", "project_name", "notes", "is_active", "status", "company", "percent_complete", "percent_complete_method", "priority"];

function encode(item) {
  return JSON.stringify(item)
}

function queryStringBuilder(args, encodeValues) {
  if (!args) {
    return false;
  }

  let params = [];
  params = Object.keys(args).map(key => `${key}=${encodeURIComponent(encodeValues ? encode(args[key]) : args[key])}`)
  return params.join('&');
}

function parseFrappeErrorResponse(err) {
  if (!err.response || typeof err.response.data === undefined) {
    return null;
  }


  let message = "Unexpected error",
    server_messages = [],
    remoteTrace = [];

  let errorInfo = { status: err.status, statusText: err.statusText, data: err.response.data || '' };
  //console.log("frappe parse error", errorInfo);
  if (err.status == 502 || errorInfo.data.search(/502\s+bad\s+gateway/gi) > -1) {
    message = "Unable to reach remote server. \nGot 'Gateway Time-out'";
  } else if (typeof err.response.data === 'string') {
    let rx = /(?:\<pre\>)([^<]+)(?:\<\/pre\>)/ig;
    let matches = rx.exec(err.response.data);
    if (matches && matches.length > 1) {
      remoteTrace = matches[1].trim().split("\n");
      message = remoteTrace[remoteTrace.length - 1];
    } else {
      message = err.statusText;
    }
  } else {
    if ('message' in err.response.data) {
      message = err.response.data.message;
    }
    if ('_server_messages' in err.response.data) {
      server_messages = JSON.parse(err.response.data._server_messages);
    }
    if ('exc' in err.response.data) {
      remoteTrace = JSON.parse(err.response.data.exc);
      remoteTrace = remoteTrace.map(x => x.trim().split('\n'));
      if (!message && remoteTrace.length > 0) {
        message = remoteTrace.map(x => x[x.length - 1]).join("\n");
      }
    }

  }

  console.error(message);
  return Object.assign({ message, server_messages, remoteTrace }, errorInfo);
}

class FrappeRest {
  constructor(host) {
    this.host = host;
    this.resources = {};
    this.apis = {};
  }

  api(method) {
    if (!(method in this.apis)) {
      this.apis[method] = new FrappeApi(this.host, method);
    }

    return this.apis[method];
  }

  resource(resource) {
    if (!(resource in this.resources)) {
      this.resources[resource] = new FrappeResource(this.host, resource);
    }

    return this.resources[resource];
  }
}

class FrappeApi {
  constructor(host, method) {
    this.host = host;
    this.method = method;
  }

  handleException(err) {
    let errorInfo = parseFrappeErrorResponse(err);
    if (errorInfo) {
        throw new ConnectorError(errorInfo.message || err.toString(), errorInfo);
    } else {
      throw new ConnectorError(err.toString(), err);
    }
  }

  get() {
    let params = queryStringBuilder(args);
    if (params) {
      params = `?${params}`;
    }

    return axios.get(`${this.host}/api/method/${this.method}${params}`)
      .then(response => {
        return response.data;
      })
      .catch(err => this.handleException(err));
  }

  post(args) {
    let params = queryStringBuilder(args)

    return axios.post(`${this.host}/api/method/${this.method}`, params)
      .then(response => {
        return response.data;
      })
      .catch(err => this.handleException(err));
  }
}

class FrappeResource {
  constructor(host, resource) {
    this.host = host;
    this.resource = resource;
  }

  create(data) {
    return axios.post(`${this.host}/api/resource/${this.resource}`, data)
      .then(response => {
        console.log(`Create ${this.resource}`, data);
        console.log('Response: ', response);
        return response.data;
      })
      .catch(err => {
        this._errorFactory(err, CreateError);
      });
  }

  read(args) {
    let argsStr = queryStringBuilder(args, true);

    return axios.get(`${this.host}/api/resource/${this.resource}?${argsStr}`)
      .then(response => {
        return response.data.data;
      })
      .catch(err => {
        this._errorFactory(err, ReadError);
      });
  }

  update(name, data) {
    return axios.put(`${this.host}/api/resource/${this.resource}/${name}`, data)
      .then(response => {
        return response.data;
      })
      .catch(err => {
        this._errorFactory(err, UpdateError);
      });
  }

  delete(name) {
    return axios.delete(`${this.host}/api/resource/${this.resource}`)
      .then(response => {
        return response.data;
      })
      .catch(err => {
        this._errorFactory(err, DeleteError);
      });
  }

  _errorFactory(err, errorClass) {
    if (typeof err.response.data !== undefined) {
      let errorInfo = {};
      try {
        errorInfo = parseFrappeErrorResponse(err);
      } catch (err) {
        throw new errorClass(err.toString(), {}, err);
      }
      throw new errorClass(errorInfo.message || err.toString(), errorInfo);
    }

    throw new errorClass(err.toString(), {}, err);
  }
}

let frappe = null

const API = {
  login(auth) {
    frappe = new FrappeRest(auth.host);

    return frappe.api('login').post({
      usr: auth.usr,
      pwd: auth.pwd
    })
    .catch(err => {
      // wrap error so we at least know what originated it
      throw new LoginError(err.message, err.info, err);
    });
  }
}

export default API;