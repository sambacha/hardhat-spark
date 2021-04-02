import chalk from 'chalk';
import figures from 'figures';
import elegantSpinner from 'elegant-spinner';
import logSymbols from 'log-symbols';
import indentString from 'indent-string';
import stripAnsi from 'strip-ansi';
import cliTruncate from 'cli-truncate';
import logUpdate from 'log-update';

const pointer = chalk.yellow(figures.pointer);
const skipped = chalk.yellow(figures.arrowDown);

const isDefined = x => x !== null && x !== undefined;

const getSymbol = (task, options) => {
  if (!task.spinner) {
    task.spinner = elegantSpinner();
  }

  if (task.isPending()) {
    return options.showSubtasks !== false && task.subtasks.length > 0 ? pointer : chalk.yellow(task.spinner());
  }

  if (task.isCompleted()) {
    return logSymbols.success;
  }

  if (task.hasFailed()) {
    return task.subtasks.length > 0 ? pointer : logSymbols.error;
  }

  if (task.isSkipped()) {
    return skipped;
  }

  return ' ';
};

const renderHelper = (tasks, options, level: number = 0) => {
  let output = [];

  for (const task of tasks) {
    if (task.isEnabled()) {
      const skipped = task.isSkipped() ? ` ${chalk.dim('[skipped]')}` : '';

      output.push(indentString(` ${getSymbol(task, options)} ${task.title}${skipped}`, level, {
        indent: '  '
      }));

      if ((task.isPending() || task.isSkipped() || task.hasFailed()) && isDefined(task.output)) {
        let data = task.output;

        if (typeof data === 'string') {
          data = stripAnsi(data.trim().split('\n').filter(Boolean).pop());

          if (data === '') {
            data = undefined;
          }
        }

        if (isDefined(data)) {
          const out = indentString(`${figures.arrowRight} ${data}`, level, {
            indent: '  '
          });
          output.push(`   ${chalk.gray(cliTruncate(out, process.stdout.columns - 3))}`);
        }
      }

      if ((task.isPending() || task.hasFailed() || options.collapse === false) && (task.hasFailed() || options.showSubtasks !== false) && task.subtasks.length > 0) {
        output = output.concat(renderHelper(task.subtasks, options, level + 1));
      }
    }
  }

  return output.join('\n');
};

const render = (tasks, options) => {
  logUpdate(renderHelper(tasks, options));
};

export class UpdateRenderer {
  private _id: any;
  private _tasks: any;
  private _options: any;

  constructor(tasks, options) {
    this._tasks = tasks;
    this._options = Object.assign({
      showSubtasks: true,
      collapse: true,
      clearOutput: false
    }, options);
  }

  static get nonTTY() {
    return true;
  }

  render() {
    if (this._id) {
      // Do not render if we are already rendering
      return;
    }

    this._id = setInterval(() => {
      render(this._tasks, this._options);
    }, 100);
  }

  end(err) {
    if (this._id) {
      clearInterval(this._id);
      this._id = undefined;
    }

    render(this._tasks, this._options);

    if (this._options.clearOutput && err === undefined) {
      logUpdate.clear();
    } else {
      logUpdate.done();
    }
  }
}
