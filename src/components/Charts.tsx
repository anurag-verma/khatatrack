import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';
import { getCategoryById } from '../utils/categories';
import { formatIndianCurrency } from '../utils/currency';

interface PieData {
  category: string;
  total: number;
}

interface BarData {
  month: string;
  income: number;
  expense: number;
}

interface Props {
  expenseByCategory: PieData[];
  monthlyComparison: BarData[];
}

export function ExpensePieChart({ expenseByCategory }: { expenseByCategory: PieData[] }) {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  if (expenseByCategory.length === 0) {
    return (
      <View className="items-center py-6">
        <Text className="text-gray-500">{t('noTransactions')}</Text>
      </View>
    );
  }

  const totalExpense = expenseByCategory.reduce((s, e) => s + e.total, 0);
  const pieData = expenseByCategory.map((e) => {
    const cat = getCategoryById(e.category, 'expense');
    return {
      value: e.total,
      color: cat?.color || '#6b7280',
      text: isHindi && cat ? cat.nameHi : (cat?.name || e.category),
      label: isHindi && cat ? cat.nameHi : (cat?.name || e.category),
    };
  });

  return (
    <View className="items-center py-4">
      <PieChart
        data={pieData}
        donut
        showText
        textColor="#fff"
        textSize={10}
        radius={90}
        innerRadius={50}
        centerLabelComponent={() => (
          <Text className="text-white text-xs font-bold text-center">
            {formatIndianCurrency(totalExpense)}
          </Text>
        )}
      />
      <View className="flex-row flex-wrap justify-center mt-4 gap-2">
        {pieData.map((d, i) => (
          <View key={i} className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <Text className="text-gray-400 text-xs">{d.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function MonthlyBarChart({ monthlyComparison }: { monthlyComparison: BarData[] }) {
  const { t } = useTranslation();

  if (monthlyComparison.length === 0) {
    return (
      <View className="items-center py-6">
        <Text className="text-gray-500">{t('noTransactions')}</Text>
      </View>
    );
  }

  const interleavedData = monthlyComparison.flatMap((m) => {
    const label = m.month.slice(5) + '/' + m.month.slice(2, 4);
    return [
      {
        value: m.income,
        label,
        frontColor: '#22c55e',
        barWidth: 10,
      },
      {
        value: m.expense,
        label: '',
        frontColor: '#ef4444',
        barWidth: 10,
      },
    ];
  });

  const maxVal = Math.max(...interleavedData.map((d) => d.value), 1);

  return (
    <View className="py-4">
      <BarChart
        data={interleavedData}
        barWidth={10}
        spacing={4}
        roundedTop
        hideRules
        yAxisThickness={0}
        xAxisColor="#1f1f1f"
        maxValue={maxVal * 1.3}
        yAxisTextStyle={{ color: '#6b7280', fontSize: 10 }}
        xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 9 }}
        isAnimated
      />
      <View className="flex-row justify-center gap-6 mt-3">
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-3 rounded-sm bg-[#22c55e]" />
          <Text className="text-gray-400 text-xs">Income</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-3 h-3 rounded-sm bg-[#ef4444]" />
          <Text className="text-gray-400 text-xs">Expense</Text>
        </View>
      </View>
    </View>
  );
}
