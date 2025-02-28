import { ParseError } from '@lightdash/common';
import execa from 'execa';
import { LightdashAnalytics } from '../../analytics/analytics';
import GlobalState from '../../globalState';
import { generateHandler } from '../generate';
import { DbtCompileOptions } from './compile';

type DbtRunHandlerOptions = DbtCompileOptions & {
    excludeMeta: boolean;
    verbose: boolean;
};

export const dbtRunHandler = async (
    options: DbtRunHandlerOptions,
    command: any,
) => {
    GlobalState.setVerbose(options.verbose);
    await LightdashAnalytics.track({
        event: 'dbt_command.started',
        properties: {
            command: `${command.parent.args}`,
        },
    });

    const commands = command.parent.args.reduce(
        (acc: unknown[], arg: unknown) => {
            if (arg === '--verbose') return acc;
            return [...acc, arg];
        },
        [],
    );

    GlobalState.debug(`> Running dbt command: ${commands}`);

    try {
        const subprocess = execa('dbt', commands, {
            stdio: 'inherit',
        });
        await subprocess;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '-';
        await LightdashAnalytics.track({
            event: 'dbt_command.error',
            properties: {
                command: `${commands}`,
                error: `${msg}`,
            },
        });
        throw new ParseError(`Failed to run dbt:\n  ${msg}`);
    }
    await generateHandler({
        ...options,
        assumeYes: true,
        excludeMeta: options.excludeMeta,
    });
};
