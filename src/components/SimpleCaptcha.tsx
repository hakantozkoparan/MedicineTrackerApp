import { COLORS, FONTS, SIZES } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface SimpleCaptchaProps {
  onVerified: (isVerified: boolean) => void;
  resetTrigger?: number; // Optional prop to trigger reset from parent
}

const SimpleCaptcha: React.FC<SimpleCaptchaProps> = ({ onVerified, resetTrigger }) => {
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);
  const [operator, setOperator] = useState<string>('');
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);

  // Generate random numbers and operator
  const generateCaptcha = () => {
    const operators = ['+', '-', '*'];
    const randomOperator = operators[Math.floor(Math.random() * operators.length)];
    let number1 = Math.floor(Math.random() * 10) + 1; // 1-10
    let number2 = Math.floor(Math.random() * 10) + 1; // 1-10
    
    // For subtraction, ensure num1 >= num2 to avoid negative results
    if (randomOperator === '-' && number1 < number2) {
      [number1, number2] = [number2, number1];
    }
    
    // For multiplication, use smaller numbers
    if (randomOperator === '*') {
      number1 = Math.floor(Math.random() * 5) + 1; // 1-5
      number2 = Math.floor(Math.random() * 5) + 1; // 1-5
    }

    let answer: number;
    switch (randomOperator) {
      case '+':
        answer = number1 + number2;
        break;
      case '-':
        answer = number1 - number2;
        break;
      case '*':
        answer = number1 * number2;
        break;
      default:
        answer = number1 + number2;
    }

    setNum1(number1);
    setNum2(number2);
    setOperator(randomOperator);
    setCorrectAnswer(answer);
    setUserAnswer('');
    setIsVerified(false);
    setShowError(false);
    onVerified(false);
  };

  // Generate captcha on component mount and when resetTrigger changes
  useEffect(() => {
    generateCaptcha();
  }, [resetTrigger]);

  // Check answer when user input changes
  useEffect(() => {
    if (userAnswer.trim() !== '') {
      const numericAnswer = parseInt(userAnswer);
      if (!isNaN(numericAnswer)) {
        if (numericAnswer === correctAnswer) {
          setIsVerified(true);
          setShowError(false);
          onVerified(true);
        } else {
          setIsVerified(false);
          setShowError(true);
          onVerified(false);
        }
      } else {
        setIsVerified(false);
        setShowError(false);
        onVerified(false);
      }
    } else {
      setIsVerified(false);
      setShowError(false);
      onVerified(false);
    }
  }, [userAnswer, correctAnswer, onVerified]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Güvenlik Doğrulaması</Text>
      <View style={styles.captchaContainer}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>
            {num1} {operator} {num2} =
          </Text>
        </View>
        <TextInput
          style={[
            styles.input,
            isVerified && styles.inputSuccess,
            showError && styles.inputError
          ]}
          placeholder="?"
          value={userAnswer}
          onChangeText={setUserAnswer}
          keyboardType="numeric"
          placeholderTextColor={COLORS.gray}
          maxLength={3}
        />
      </View>
      {showError && (
        <Text style={styles.errorText}>Yanlış cevap. Tekrar deneyin.</Text>
      )}
      {isVerified && (
        <Text style={styles.successText}>✓ Doğrulama başarılı</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: SIZES.medium,
    fontFamily: FONTS.semiBold,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  captchaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questionContainer: {
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  questionText: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.darkGray,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.medium,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.white,
    textAlign: 'center',
  },
  inputSuccess: {
    borderColor: COLORS.success || '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  inputError: {
    borderColor: COLORS.error || '#F44336',
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: COLORS.error || '#F44336',
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    marginTop: 5,
  },
  successText: {
    color: COLORS.success || '#4CAF50',
    fontSize: SIZES.small,
    fontFamily: FONTS.semiBold,
    marginTop: 5,
  },
});

export default SimpleCaptcha;
