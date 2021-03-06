/**
 * @remarks
 * This module is meant to allow quick and easy command line argument parsing.   It does not intend to be a full
 * fledged DI system.  It is meant to be a basic parser but strives for convience and correctness in parsing.
 *
 */
import {
    ArgType,
    HelpFn,
    Converter,
    ConverterMap,
    ConfigOptions,
    ConfigParserFn,
    Resolution,
    ConverterResolveFn
} from "/lib/ts-args-types";

const argMetadataKey = Symbol("argMetadataKey");
const configMetadataKey = Symbol("configMetatdataKey");

const isArrayType = (v: ArgType) => v.itemType != null || v.type === Array || (typeof v.type == 'string' && v.type.endsWith('[]'));

const arrayType = (v: ArgType): string | any => ({
    type: v.itemType != null ? v.itemType : typeof v.type === 'string'
        ? v.type.replace(/\[\]$/, '') || 'string' : 'string'
});

const _niceType = (type: any): string => {
    if (isBoolean(type)) {
        return 'boolean';
    }
    if (type === Number || type === 'number' || type === 'Number') {
        return 'number';
    }
    if (type === String || type === 'string' || type === 'String') {
        return 'string';
    }
    if (type === Date || type === 'Date') {
        return 'Date';
    }
    if (type === Symbol || type == 'symbol') {
        return 'symbol';
    }
    if (type === Array || type === 'Array' || /\[\]$/.test(type)) {
        return '[]';
    }
    if (type instanceof RegExp) {
        return 'RegExp';
    }
    return 'string';

};
const niceType = (v: ArgType): string => isArrayType(v) ?
    `${v.itemType ? _niceType(v.itemType) : ''}[]` : _niceType(v.type);

const niceKey = (v: ArgType): string | number => typeof v.key == 'symbol' ? v.long! : v.key!;

const isBoolean = (v: any): boolean => (v === Boolean || v === 'boolean' || v === 'Boolean');

const RESOLUTION: Resolution[] = [Resolution.ARG, Resolution.ENV, Resolution.FILE, Resolution.PACKAGE];

const toHyphen = (str: string, sep = '-') => str.replace(/([a-z])?([A-Z])/g, (_, a, b) => ((a == null ? '' : `${a}${sep}`) + b.toLowerCase()));

const addArg = (target: any, conf: ArgType, propertyKey: string | symbol | number, type: any): ArgTypeInt[] => {
    if (typeof propertyKey === 'symbol' && !conf.long) {
        throw new Error(`When annotating a symbol, a long argument descriptor is required`);
    }
    const long = conf.long || typeof propertyKey === 'symbol' ? conf.long : propertyKey + '';
    const arg: ArgTypeInt = {
        long,
        short: long![0],
        type,
        ...conf,
        key: propertyKey
    };

    if (arg.long === 'help') {
        throw new Error(`--help is always help, please assign a different long value for '${long}'`);
    }

    if (arg.short === 'h') {
        throw new Error(`-h is always help, please assign a different short value for '${long}'`);
    }

    const ret = [arg];
    return ret;
};

/**
 * This a decorator for properties fields in typescript classes.
 * @param description - Either a description a converter or a configuration argument.
 **/
export function Arg(description?: ArgType | string | Converter) {
    const conf = description == null ? {} : typeof description === 'string' ? { description } : typeof description == 'function' ? { converter: description } : description;

    return function (target: any, propertyKey?: string | symbol) {
        if (propertyKey == null && conf.key == null) {
            throw new Error('A property key is required, when using on Class target');
        }
    }
}

const strFn = (v: string) => v;
const jsonFn = (v: string) => JSON.parse(v);
const splitFn = (v: string) => v.split(/,\s*/);
const dateFn = (v: string) => new Date(v);
const regexFn = (v: string) => {
    const parts = /^\/(.+?)\/([gimus]+?)?$/.exec(v);
    if (parts) {
        return new RegExp(parts[1], parts[2]);
    }
    return new RegExp(v);
};
const boolFn = (v: string) => v == null ? false : /true|1|"true"/i.test(v);

export const CONVERTERS = new Map<any, Converter>([
    ['Int', v => parseInt(v, 10)],
    ['Number', parseFloat],
    ['number', parseFloat],
    ['Boolean', boolFn],
    ['boolean', boolFn],
    ['String', strFn],
    ['string', strFn],
    ['JSON', jsonFn],
    ['Date', dateFn],
    ['[]', splitFn],
    ['Array', splitFn],
    ['RegExp', regexFn],
    [Number, parseFloat],
    [String, strFn],
    [Boolean, boolFn],
    [Date, dateFn],
    [Array, splitFn],
    [RegExp, regexFn]
]);


const _usage = (conf: ArgType[]): string => {
    const shorts = conf.filter(v => !v.default).map(v => v.short).join('');
    const def = conf.find(v => v.default);
    if (def) {
        return `-${shorts} ${isArrayType(def) ? `[${def.long} ...]` : def.long}`
    }
    return `-${shorts}`;
};


const _help: HelpFn = (script: string, conf: ArgType[], message?: string): void => {

    const sorted = conf.concat().sort((a, b) => {

        if (a.required != b.required) {
            return a.required ? -1 : 1;
        }
        return a.default ? 1 : a.long!.localeCompare(b.long!);
    });

    if (message) {
        message = `${('Error')}: ${message}\n\n`
    }
    sorted.unshift({
        long: 'help',
        short: 'h',
        description: 'This helpful message'
    });
    console.warn(`${message || ''}${script}\nusage: ${_usage(sorted)}
 ${sorted.map(v => `  ${v.required ? '*' : ' '} --${toHyphen(v.long!)}\t-${v.short}\t${v.description || ''} `).join('\n')}
 
 `);

    return;
};

type ArgTypeInt = ArgType;
type TargetArgFn = (target: any, argumentConfs: ArgTypeInt[], resolve: ConverterResolveFn) => boolean;
/**
 * Configures an object from command line arguments
 * @param target - Is the object to configure
 * @param args - `process.argv` or your own array of strings.
 * @param env - `process.env` or your very own env.
 * @param converters - A Map of converters that take a string and return a value or a function that returns converters.
 * @param help - A function for help, this one call on invocation, you may not want that.
 */
export const configure = <T extends ArgTypeInt[] = ArgTypeInt[]>(target: T,
    args: string[] = [],
    env: Record<string, string> = {},
    converters: ConverterMap | ConverterResolveFn = CONVERTERS,
    help: HelpFn = _help): T | undefined => {
    const script = args[1];
    const resolution = [Resolution.ARG];
    // const conf = Reflect.getMetadata(configMetadataKey, target.constructor) as ConfigOptions;
    // const resolution: Resolution[] = conf?.resolution?.concat().reverse() ?? [Resolution.ARG];
    const resolver = typeof converters === 'function' ? converters : (v: ArgTypeInt) => converters.get(v.type);
    const order = Array<TargetArgFn>();

    order[Resolution.ARG] = (target, argumentConfs, converter): boolean => {
        const local = {};
        for (let i = 2; i < args.length; i++) {
            const [arg, value] = args[i].split('=', 2);
            const found = argumentConfs.find(v => {
                const long = toHyphen(v.long!);
                if (arg === `-${v.short}` || arg === `--${long}`) {
                    return true;
                }
                return isBoolean(v.type) && arg === `--no-${long}`;
            });

            //Keep found because if a default option is present it will suck up the rest of the values.
            const c = found || argumentConfs.find(v => v.default);

            if (!c) {
                help(script, argumentConfs, `Unknown argument '${arg}'`);
                return true;
            }

            if (isBoolean(c.type)) {
                const isNeg = arg.startsWith('--no-');
                if (value == null) {
                    local[c.key!] = !isNeg;
                } else {
                    const cValue = converter(c, boolFn)(value);
                    local[c.key!] = isNeg ? !cValue : cValue;
                }
            } else {
                const convert = converter(c, strFn);

                try {
                    const unparsedValue = value != null ? value : found ? args[++i] : args[i];
                    if (isArrayType(c)) {
                        // We allow
                        // multiple argument calls --arg 1 --arg 2  == [1,2] while env.ARG=3 should not get pushed on top.
                        // Depending on order of course.
                        local[c.key!] = [
                            ...(local[c.key!] || []),
                            ...converter(c, splitFn)(unparsedValue).map(converter(arrayType(c), strFn))
                        ];
                    } else {
                        local[c.key!] = convert(unparsedValue);
                    }
                } catch (e) {
                    help(script, argumentConfs, `Converting '${value ?? args[i]}' to type '${niceType(c.type)}' failed\n ${e.message || e}`);
                    return true;
                }
            }
        }
        console.log("local", local);
        Object.assign(target, local);
        return false;
    };


    const _configure = (target: T, parent?: string): T | undefined => {
        const argTypes: ArgTypeInt[] = ((args: ArgTypeInt[] = []) => parent ?
            args.map(v => ({
                ...v,
                short: `${parent}-${v.short}`,
                long: `${parent}-${v.long}`
            })) : args)(target);

        const converter: ConverterResolveFn = (c: ArgTypeInt, def = v => v) => {

            if ('converter' in c) {
                return c.converter!;
            }

            if ('type' in c) {
                const r = resolver(c);
                if (r != null) {
                    return r;
                }
            }

            return def;
        };

        if (args.includes('-h') || args.includes('--help')) {
            help(script, argTypes);
            return;
        }

        //The last has highest precedent, so we reverse it and go through it.
        if (resolution.find((r) => order[r](target, argTypes, converter)) != null) {
            return;
        }

        const fail = argTypes.find(v => v.required && target[v.key!] == null);

        if (fail) {
            help(script, argTypes, `Required argument '${fail.long}' was not supplied.`);
            return;
        }
        return target;
    };
    return _configure(target, undefined);
};