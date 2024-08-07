import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:friend_private/backend/mixpanel.dart';
import 'package:friend_private/backend/preferences.dart';
import 'package:friend_private/backend/storage/plugin.dart';
import 'package:friend_private/pages/plugins/plugin_detail.dart';
import 'package:friend_private/utils/temp.dart';
import 'package:gradient_borders/gradient_borders.dart';
import 'package:url_launcher/url_launcher.dart';

class PluginsPage extends StatefulWidget {
  const PluginsPage({super.key});

  @override
  _PluginsPageState createState() => _PluginsPageState();
}

class _PluginsPageState extends State<PluginsPage> {
  bool isLoading = true;
  String searchQuery = '';
  List<Plugin> plugins = [];

  Future<void> _fetchPlugins() async {
    var prefs = SharedPreferencesUtil();
    var pluginsList = prefs.pluginsList;
    var pluginsId = prefs.pluginsEnabled;
    for (var plugin in pluginsList) {
      plugin.isEnabled = pluginsId.contains(plugin.id);
    }
    plugins = pluginsList;
    setState(() => isLoading = false);
  }

  @override
  void initState() {
    _fetchPlugins();
    super.initState();
  }

  Future<void> _togglePlugin(String pluginId, bool isEnabled) async {
    var prefs = SharedPreferencesUtil();
    if (isEnabled) {
      prefs.enablePlugin(pluginId);
      MixpanelManager().pluginEnabled(pluginId);
    } else {
      prefs.disablePlugin(pluginId);
      MixpanelManager().pluginDisabled(pluginId);
    }
    _fetchPlugins();
  }

  List<Plugin> _filteredPlugins() {
    return searchQuery.isEmpty
        ? plugins
        : plugins.where((plugin) => plugin.name.toLowerCase().contains(searchQuery.toLowerCase())).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filteredPlugins = _filteredPlugins();
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.primary,
        automaticallyImplyLeading: true,
        title: const Text('Plugins'),
        centerTitle: true,
        elevation: 0,
        actions: [
          TextButton(
              onPressed: () {
                launchUrl(Uri.parse('https://docs.basedhardware.com/developer/Plugins'));
              },
              child: const Row(
                children: [
                  Text(
                    'Create Yours',
                    style: TextStyle(color: Colors.white),
                  ),
                  SizedBox(
                    width: 8,
                  ),
                ],
              ))
        ],
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Column(
          children: [
            const SizedBox(
              height: 32,
            ),
            Container(
              width: double.maxFinite,
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              decoration: const BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.all(Radius.circular(16)),
                border: GradientBoxBorder(
                  gradient: LinearGradient(colors: [
                    Color.fromARGB(127, 208, 208, 208),
                    Color.fromARGB(127, 188, 99, 121),
                    Color.fromARGB(127, 86, 101, 182),
                    Color.fromARGB(127, 126, 190, 236)
                  ]),
                  width: 1,
                ),
                shape: BoxShape.rectangle,
              ),
              // TODO: reuse chat textfield
              child: TextField(
                onChanged: (value) {
                  setState(() {
                    searchQuery = value;
                  });
                },
                obscureText: false,
                decoration: const InputDecoration(
                  hintText: 'Find your plugin',
                  hintStyle: TextStyle(
                    color: Colors.white,
                    fontSize: 14.0,
                    fontWeight: FontWeight.w500,
                  ),
                  enabledBorder: UnderlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1.0,
                    ),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(4.0),
                      topRight: Radius.circular(4.0),
                    ),
                  ),
                  focusedBorder: UnderlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1.0,
                    ),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(4.0),
                      topRight: Radius.circular(4.0),
                    ),
                  ),
                  errorBorder: UnderlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1.0,
                    ),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(4.0),
                      topRight: Radius.circular(4.0),
                    ),
                  ),
                  focusedErrorBorder: UnderlineInputBorder(
                    borderSide: BorderSide(
                      color: Color(0x00000000),
                      width: 1.0,
                    ),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(4.0),
                      topRight: Radius.circular(4.0),
                    ),
                  ),
                ),
                style: const TextStyle(
                  // fontFamily: FlutterFlowTheme.of(context).bodyMediumFamily,
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: filteredPlugins.length,
                itemBuilder: (context, index) {
                  final plugin = filteredPlugins[index];
                  return Container(
                    padding: const EdgeInsets.fromLTRB(8, 8, 0, 8),
                    decoration: BoxDecoration(
                      shape: BoxShape.rectangle,
                      borderRadius: const BorderRadius.all(Radius.circular(16.0)),
                      color: Colors.grey.shade900,
                    ),
                    margin: EdgeInsets.only(bottom: 12, top: index == 0 ? 24 : 0, left: 16, right: 16),
                    child: ListTile(
                      onTap: () async {
                        await routeToPage(context, PluginDetailPage(plugin: plugin));
                        _fetchPlugins();
                        // refresh plugins
                      },
                      leading: CircleAvatar(
                        backgroundColor: Colors.white,
                        maxRadius: 28,
                        backgroundImage:
                            NetworkImage('https://raw.githubusercontent.com/BasedHardware/Friend/main/${plugin.image}'),
                      ),
                      title: Text(
                        plugin.name,
                        maxLines: 1,
                        style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white, fontSize: 16),
                      ),
                      subtitle: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(height: plugin.ratingAvg != null ? 4 : 0),
                          Padding(
                            padding: const EdgeInsets.only(top: 4.0),
                            child: Text(
                              plugin.description,
                              maxLines: 2,
                              style: const TextStyle(color: Colors.grey, fontSize: 14),
                            ),
                          ),
                          SizedBox(height: plugin.ratingAvg != null ? 4 : 0),
                          plugin.ratingAvg != null
                              ? Row(
                                  children: [
                                    Text(plugin.ratingAvg!.toString()),
                                    const SizedBox(width: 4),
                                    RatingBar.builder(
                                      initialRating: plugin.ratingAvg!,
                                      minRating: 1,
                                      direction: Axis.horizontal,
                                      allowHalfRating: true,
                                      itemCount: 5,
                                      itemSize: 16,
                                      ignoreGestures: true,
                                      itemPadding: const EdgeInsets.symmetric(horizontal: 0),
                                      itemBuilder: (context, _) => const Icon(Icons.star, color: Colors.amber),
                                      maxRating: 5.0,
                                      onRatingUpdate: (rating) {},
                                    ),
                                    const SizedBox(width: 4),
                                    Text('(${plugin.ratingCount})'),
                                  ],
                                )
                              : Container(),
                        ],
                      ),
                      trailing: IconButton(
                        icon: Icon(
                          plugin.isEnabled ? Icons.check : Icons.arrow_downward_rounded,
                          color: plugin.isEnabled ? Colors.white : Colors.grey,
                        ),
                        onPressed: () {
                          _togglePlugin(plugin.id.toString(), !plugin.isEnabled);
                        },
                      ),
                      // trailing: Switch(
                      //   value: plugin.isEnabled,
                      //   activeColor: Colors.deepPurple,
                      //   onChanged: (value) {
                      //     _togglePlugin(plugin.id.toString(), value);
                      //   },
                      // ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
