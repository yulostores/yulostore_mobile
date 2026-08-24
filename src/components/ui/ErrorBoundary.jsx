import { Component } from "react";
import { View } from "react-native";

import Button from "./Button";
import Screen from "./Screen";
import Text from "./Text";

// A render error anywhere below this leaves the customer looking at a blank
// screen on a device build — there's no red box outside development, and no
// browser console to read. This catches it, says so, and offers the one action
// that can help: re-mounting the tree from scratch.
//
// It has to be a class: `componentDidCatch`/`getDerivedStateFromError` have no
// hook equivalent.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Nowhere to report to yet — swap for the crash reporter's capture call
    // when one is wired up. Logged rather than swallowed so the stack is still
    // findable in `expo start`'s output.
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Screen edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="font-jakarta-bold text-[20px] leading-[28px] text-foreground">
            Something went wrong
          </Text>

          <Text className="text-center font-jakarta text-[15px] leading-[22px] text-muted-foreground">
            The app hit an unexpected error. Reloading usually clears it.
          </Text>

          {__DEV__ ? (
            <Text className="mt-2 text-center font-jakarta text-[12px] leading-[18px] text-destructive">
              {String(error?.message ?? error)}
            </Text>
          ) : null}

          <Button className="mt-4" onPress={() => this.setState({ error: null })}>
            Try again
          </Button>
        </View>
      </Screen>
    );
  }
}
