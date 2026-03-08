import React from 'react';

declare namespace JSX {
  interface IntrinsicElements {
    'gmp-place-autocomplete': React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLElement>, HTMLElement> & {
      'web-component-mode'?: string;
      'type-restrictions'?: string;
      'country-restrictions'?: string;
    };
  }
}

export {};
