import { Box, Text } from 'ink';
import React, { useCallback, useState } from 'react';
import TextInput from 'ink-text-input';


export function ConfirmationQuestion({
                                       userPrompt,
                                       resolve,
                                     }) {
  const [answer, setAnswer] = useState();
  const [value, setValue] = useState('');
  const handleSubmit = useCallback(submitValue => {
    if (
      submitValue == '' ||
      submitValue == 'y' ||
      submitValue == 'Y' ||
      submitValue == 'Yes' ||
      submitValue == 'yes'
    ) {
      resolve(true);
      return;
    }

    resolve(false);
  }, [setAnswer]);

  return (
    <Box flexDirection={'column'}>
      <Text>{userPrompt} (Y/n): </Text>

      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
