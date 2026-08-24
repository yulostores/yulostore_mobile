import { useEffect, useState } from "react";
import { ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { Mic, Search, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import BottomSheet from "@/components/ui/BottomSheet";
import PressableScale from "@/components/ui/PressableScale";
import Text from "@/components/ui/Text";
import VegModeBanner from "@/components/home/VegModeBanner";
import useVoiceSearch from "@/hooks/useVoiceSearch";
import { ACCENTS, LISTENING_COLOR } from "@/lib/accent";
import { DURATION, PRESS_SCALE, enter, exit } from "@/lib/motion";
import { formatCount, sectionItems } from "@/data/menu";

// The list is capped at a share of the window rather than a fixed height, so a
// short menu sits at its natural size and a long one scrolls instead of pushing
// the search field off the top of the sheet.
const LIST_HEIGHT_RATIO = 0.55;

// What the floating "Menu" button opens: the section index, so a long menu can
// be jumped through without scrolling past every dish. Picking a section expands
// it and scrolls it to the top of the screen.
//
// A section split into named groups doesn't jump on the first tap — it opens in
// place and lists its groups, each its own jump target. The count stays on the
// section, since that's the number of dishes the customer lands among either
// way.
export default function MenuIndexSheet({
  visible,
  sections,
  accent = ACCENTS.default,
  vegOnly = false,
  query,
  onChangeQuery,
  placeholder = "Search in menu",
  onSelect,
  onDismiss,
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Which section has its groups showing. Sheet-local: it's a way of reading the
  // index, not a change to how the menu underneath is folded.
  const [openId, setOpenId] = useState(null);

  const voice = useVoiceSearch({ onResult: (transcript) => onChangeQuery?.(transcript) });

  // A reopened sheet starts collapsed, so it never comes back holding a section
  // the customer opened several storefronts ago. A sheet dismissed mid-listen
  // shouldn't keep the mic hot behind it either.
  useEffect(() => {
    if (!visible) {
      setOpenId(null);
      voice.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSectionPress = (section) => {
    if (!section.groups) {
      onSelect?.(section.id);
      return;
    }
    setOpenId((current) => (current === section.id ? null : section.id));
  };

  return (
    // Searching the menu from here puts the keyboard over the bottom of the
    // window, which is where this panel — and its search field — sit.
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      label="menu index"
      keyboardAvoiding
      scrimClassName="bg-black/40"
      className="bg-background"
      // Veg mode's confirmation rides above the dimmed backdrop rather than
      // inside the sheet — the customer has to be able to see it's on while
      // they're picking which part of the menu to read.
      overlay={
        vegOnly ? (
          <View style={{ paddingTop: insets.top + 4 }} className="px-2">
            <VegModeBanner className="w-full justify-center rounded-2xl px-4 py-3" />
          </View>
        ) : null
      }
    >
      <View className="mt-4 h-14 flex-row items-center rounded-full bg-card px-5 shadow-md shadow-black/10">
            <Search size={22} color={accent.icon} />

            <TextInput
              value={query}
              onChangeText={onChangeQuery}
              placeholder={placeholder}
              placeholderTextColor="#999999"
              returnKeyType="search"
              className="h-full flex-1 px-4 font-jakarta-medium text-[16px] text-foreground"
              accessibilityLabel="Search in menu"
            />

        {voice.available ? (
          <>
            <View className="mr-3 h-6 w-px bg-border" />

            <PressableScale
              hitSlop={8}
              scale={PRESS_SCALE.tight}
              accessibilityRole="button"
              accessibilityLabel={voice.listening ? "Stop voice search" : "Voice search"}
              onPress={voice.toggle}
            >
              <Mic size={22} color={voice.listening ? LISTENING_COLOR : accent.icon} />
            </PressableScale>
          </>
        ) : null}
      </View>

      {voice.error ? (
        <Text className="mt-2 font-jakarta text-[12px] text-destructive">{voice.error}</Text>
      ) : null}

      {sections.length ? (
        <ScrollView
          style={{ maxHeight: height * LIST_HEIGHT_RATIO }}
          className="mt-3"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sections.map((section, index) => {
            const open = openId === section.id;
            const count = sectionItems(section).length;

            return (
              <View key={section.id}>
                <PressableScale
                  entering={enter(FadeIn, { index, base: 80 })}
                  onPress={() => handleSectionPress(section)}
                  scale={PRESS_SCALE.subtle}
                  className="flex-row items-center gap-3 py-4"
                  accessibilityRole="button"
                  accessibilityState={section.groups ? { expanded: open } : undefined}
                  accessibilityLabel={`${section.title}, ${count} ${count === 1 ? "item" : "items"}`}
                >
                  <Text
                    numberOfLines={2}
                    className="shrink font-jakarta-semibold text-[21px] leading-[28px] text-foreground"
                  >
                    {section.title}
                  </Text>

                  {section.groups && open ? (
                    <Animated.View
                      entering={enter(FadeIn, { duration: DURATION.fast })}
                      exiting={exit(FadeOut)}
                      style={{ backgroundColor: accent.tint }}
                      className="size-7 items-center justify-center rounded-full"
                    >
                      <X size={15} color={accent.icon} />
                    </Animated.View>
                  ) : null}

                  <View className="flex-1" />

                  <Text className="font-jakarta-semibold text-[21px] leading-[28px] text-foreground">
                    {formatCount(count)}
                  </Text>
                </PressableScale>

                {/* Expanding a section reveals its groups in sequence, which
                    is what makes the tap read as "this opened" rather than
                    "the list changed underneath me". */}
                {section.groups && open
                  ? section.groups.map((group, groupIndex) => (
                      <PressableScale
                        key={group.id}
                        entering={enter(FadeIn, { index: groupIndex, duration: DURATION.fast })}
                        exiting={exit(FadeOut, { duration: DURATION.instant })}
                        onPress={() => onSelect?.(group.id)}
                        scale={PRESS_SCALE.subtle}
                        className="py-3 pl-[72px]"
                        accessibilityRole="button"
                        accessibilityLabel={`${group.title}, in ${section.title}`}
                      >
                        <Text
                          numberOfLines={1}
                          className="font-jakarta text-[19px] leading-[26px] text-foreground"
                        >
                          {group.title}
                        </Text>
                      </PressableScale>
                    ))
                  : null}
              </View>
            );
          })}

          <View className="mt-4 h-px bg-border" />
        </ScrollView>
      ) : (
        <Text className="py-10 text-center font-jakarta-medium text-[14px] leading-[20px] text-muted-foreground">
          No sections match this search.
        </Text>
      )}
    </BottomSheet>
  );
}
