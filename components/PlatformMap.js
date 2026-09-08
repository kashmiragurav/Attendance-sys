import { StyleSheet, Text, View } from 'react-native';

const MapView = (props) => {
    return (
        <View style={[styles.container, props.style]}>
            <Text style={styles.text}>Map is not available on Web</Text>
        </View>
    );
};

export const Marker = (props) => {
    return null;
};

export const Callout = (props) => {
    return null;
};

export const Polyline = (props) => {
    return null;
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#7f8c8d',
        fontWeight: 'bold'
    }
});

export default MapView;
