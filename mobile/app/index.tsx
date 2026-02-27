import { StyleSheet, Text, View } from "react-native";
import type { Database } from "@bananawatch/types";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BananaWatch</Text>
      <Text style={styles.subtitle}>Scanner landing — camera view coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
});
