/** Shared styles, built only on Home Assistant's theme variables so every theme applies. */

import { css } from "lit";

export const shared = css`
  :host {
    color: var(--primary-text-color);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, sans-serif));
  }
  .card {
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border-radius: var(--ha-card-border-radius, 12px);
    border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
    box-shadow: var(--ha-card-box-shadow, none);
    padding: 16px;
  }
  h2 {
    font-size: 1.15rem;
    font-weight: 500;
    margin: 0;
  }
  .card-header {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .small {
    font-size: 0.85rem;
  }
  button {
    align-items: center;
    background: none;
    border: 1px solid var(--divider-color);
    border-radius: 18px;
    color: var(--primary-text-color);
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
  }
  button:hover:not([disabled]) {
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  }
  button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  button[disabled] {
    cursor: default;
    opacity: 0.5;
  }
  button.primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  button.primary:hover:not([disabled]) {
    background: color-mix(in srgb, var(--primary-color) 85%, black);
  }
  button.danger {
    border-color: var(--error-color);
    color: var(--error-color);
  }
  button.icon {
    border: none;
    border-radius: 50%;
    justify-content: center;
    min-height: 40px;
    min-width: 40px;
    padding: 0;
  }
  ha-icon {
    --mdc-icon-size: 20px;
  }
  input,
  select {
    background: var(--input-fill-color, var(--secondary-background-color));
    border: 1px solid var(--input-idle-line-color, var(--divider-color));
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--primary-text-color);
    font: inherit;
    min-height: 40px;
    padding: 0 12px;
    width: 100%;
  }
  input:focus,
  select:focus {
    border-color: var(--primary-color);
    outline: none;
  }
  label {
    display: grid;
    font-size: 0.85rem;
    gap: 4px;
  }
  .chip {
    border-radius: 12px;
    display: inline-flex;
    font-size: 0.78rem;
    gap: 4px;
    padding: 2px 8px;
    white-space: nowrap;
  }
  .chip.ok {
    background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent);
    color: var(--success-color, #43a047);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 18%, transparent);
    color: var(--warning-color, #ffa600);
  }
  .chip.bad {
    background: color-mix(in srgb, var(--error-color, #db4437) 15%, transparent);
    color: var(--error-color, #db4437);
  }
  .chip.neutral {
    background: var(--secondary-background-color);
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color);
    font-size: 0.8rem;
  }
`;
