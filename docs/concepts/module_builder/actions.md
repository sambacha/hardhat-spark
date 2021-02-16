# Actions

Actions are used to surface some dynamic event data (e.g. contract function response) to other events.

```typescript
m.registerAction('getName', (): any => {
  return 'hello';
});

await m.action('getName');
```
