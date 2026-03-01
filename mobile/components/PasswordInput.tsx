import { useState } from "react";
import {
  TextInput,
  View,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type PasswordInputProps = TextInputProps & {
  /** Optional custom container style */
  containerStyle?: object;
  /** Optional custom input style */
  inputStyle?: object;
};

export function PasswordInput({
  containerStyle,
  inputStyle,
  style,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        style={[styles.input, inputStyle, style]}
        placeholderTextColor="#a8a29e"
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        accessibilityRole="button"
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={20}
          color="#78716c"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d6d3d1",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 44,
    fontSize: 16,
    color: "#1c1917",
  },
  toggle: {
    position: "absolute",
    right: 8,
    padding: 6,
  },
  togglePressed: {
    opacity: 0.7,
  },
});
